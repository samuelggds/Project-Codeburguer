import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminApi, productImageUrl } from '../api.js';
import { formatPriceInput, MAX_IMAGE_BYTES, parsePriceToReais } from '../utils.js';
import { getApiError } from '../../../services/authService.js';

const imageTypes = ['image/png', 'image/jpeg', 'image/webp'];
const emptyForm = { name: '', price: '', category: '', offer: false };

export default function AdminProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [values, setValues] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [errors, setErrors] = useState({});
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const form = useRef(null);
  const fileInput = useRef(null);
  const savingRef = useRef(false);
  const requestVersion = useRef(0);

  useEffect(() => {
    const version = ++requestVersion.current;
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    setSaveError('');
    setErrors({});
    setProduct(null);
    setValues(emptyForm);
    setFile(null);
    setSaving(false);
    savingRef.current = false;

    Promise.all([
      adminApi.listCategories({ signal: controller.signal }),
      editing ? adminApi.getProduct(id, { signal: controller.signal }) : Promise.resolve(null),
    ]).then(([nextCategories, nextProduct]) => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(nextCategories)) throw new Error('Não foi possível carregar as categorias.');
      if (editing && (!nextProduct || !nextProduct.id)) throw new Error('Produto não encontrado.');
      setCategories(nextCategories);
      setProduct(nextProduct);
      if (nextProduct) {
        setValues({
          name: nextProduct.name || '',
          price: formatPriceInput(nextProduct.price),
          category: String(nextProduct.category_id || nextProduct.category?.id || ''),
          offer: nextProduct.offer === true || nextProduct.offer === 'true',
        });
      }
    }).catch((error) => {
      if (!controller.signal.aborted) setLoadError(getApiError(error));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => {
      controller.abort();
      // Ignore a response from a save started on a previous product or route.
      if (requestVersion.current === version) requestVersion.current += 1;
    };
  }, [id, editing, revision]);

  useEffect(() => {
    setImageFailed(false);
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function changeValue(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
    setSaveError('');
  }

  function chooseImage(event) {
    const nextFile = event.target.files?.[0] || null;
    let message = '';
    if (nextFile && !imageTypes.includes(nextFile.type)) message = 'Escolha uma imagem PNG, JPG ou WebP.';
    else if (nextFile && nextFile.size > MAX_IMAGE_BYTES) message = 'A imagem deve ter no máximo 5 MB.';
    else if (nextFile && nextFile.size === 0) message = 'Escolha uma imagem válida. O arquivo está vazio.';

    setErrors((current) => ({ ...current, file: message }));
    setSaveError('');
    if (message) {
      event.target.value = '';
      setFile(null);
      return;
    }
    setFile(nextFile);
  }

  async function submit(event) {
    event.preventDefault();
    if (savingRef.current) return;
    const name = values.name.trim();
    const price = parsePriceToReais(values.price);
    const nextErrors = {};
    if (name.length < 2 || name.length > 120) nextErrors.name = 'Informe um nome de 2 a 120 caracteres.';
    if (!price) nextErrors.price = 'Informe um preço maior que zero, com até duas casas decimais.';
    if (!categories.some((category) => String(category.id) === values.category)) nextErrors.category = 'Selecione uma categoria válida.';
    if (!editing && !file) nextErrors.file = errors.file || 'Selecione uma imagem para o produto.';
    else if (errors.file) nextErrors.file = errors.file;

    setErrors(nextErrors);
    setSaveError('');
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }

    const data = new FormData();
    data.append('name', name);
    data.append('price', price);
    data.append('category_id', values.category);
    data.append('offer', String(values.offer));
    if (file) data.append('file', file);
    const version = requestVersion.current;
    savingRef.current = true;
    setSaving(true);

    try {
      if (editing) await adminApi.updateProduct(id, data);
      else await adminApi.createProduct(data);
      if (requestVersion.current !== version) return;
      navigate('/admin/produtos', {
        replace: true,
        state: { notice: editing ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.' },
      });
    } catch (error) {
      if (requestVersion.current === version) setSaveError(getApiError(error));
    } finally {
      if (requestVersion.current === version) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }

  const title = editing ? 'Editar produto' : 'Cadastrar produto';
  const image = preview || (product ? productImageUrl(product) : '');

  return (
    <section className="admin-product-editor" aria-labelledby="admin-product-form-heading">
      <h1 id="admin-product-form-heading" className="admin-sr-only">{title}</h1>
      {loading ? <p className="admin-empty" role="status">Carregando produto e categorias...</p> :
        loadError ? (
          <div className="admin-empty">
            <p className="admin-error" role="alert">{loadError}</p>
            <button className="admin-primary" type="button" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</button>
            <Link className="admin-link" to="/admin/produtos">Voltar para produtos</Link>
          </div>
        ) : (
          <form className="admin-product-form" ref={form} onSubmit={submit} noValidate aria-busy={saving}>
            <label htmlFor="admin-product-name">Nome</label>
            <input id="admin-product-name" name="name" value={values.name} maxLength={120} required disabled={saving}
              aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'admin-name-error' : undefined}
              onChange={(event) => changeValue('name', event.target.value)} />
            {errors.name && <p className="admin-field-error" id="admin-name-error">{errors.name}</p>}

            <label htmlFor="admin-product-price">Preço</label>
            <input id="admin-product-price" name="price" type="text" inputMode="decimal" value={values.price} required disabled={saving}
              placeholder="0,00" aria-invalid={Boolean(errors.price)} aria-describedby={errors.price ? 'admin-price-error' : undefined}
              onChange={(event) => changeValue('price', event.target.value)} />
            {errors.price && <p className="admin-field-error" id="admin-price-error">{errors.price}</p>}

            <div className="admin-product-upload">
              {image && !imageFailed && <img className="admin-image-preview" src={image} alt="Prévia do produto" onError={() => setImageFailed(true)} />}
              {image && imageFailed && <p className="admin-file-note">Não foi possível exibir a imagem atual.</p>}
              <label className="admin-upload-button" htmlFor="admin-product-image">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M14 4H4v16h16V10M4 15l5-5 5 6 3-3 3 4M18 1v8m-4-4h8" />
                </svg>
                {editing ? 'Trocar imagem do produto' : 'Carregar imagem do produto'}
              </label>
              <input ref={fileInput} className="admin-file-input" id="admin-product-image" name="image" type="file"
                accept="image/png,image/jpeg,image/webp" aria-label="Imagem do produto" disabled={saving} required={!editing}
                aria-invalid={Boolean(errors.file)} aria-describedby={errors.file ? 'admin-image-error' : 'admin-image-help'}
                onChange={chooseImage} />
              <p className="admin-file-note" id="admin-image-help">
                {file ? file.name : editing ? 'Sem nova imagem, a foto atual será mantida.' : 'PNG, JPG ou WebP, até 5 MB.'}
              </p>
              {errors.file && <p className="admin-field-error" id="admin-image-error">{errors.file}</p>}
            </div>

            <label htmlFor="admin-product-category">Categoria</label>
            <select id="admin-product-category" name="category" value={values.category} required disabled={saving || !categories.length}
              aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'admin-category-error' : undefined}
              onChange={(event) => changeValue('category', event.target.value)}>
              <option value="">Selecione uma categoria</option>
              {categories.map((category) => <option key={category.id} value={String(category.id)}>{category.name}</option>)}
            </select>
            {errors.category && <p className="admin-field-error" id="admin-category-error">{errors.category}</p>}
            {!categories.length && <p className="admin-field-error" role="alert">Nenhuma categoria disponível. Cadastre uma categoria antes de salvar produtos.</p>}

            <label className="admin-offer-field">
              <input type="checkbox" name="offer" checked={values.offer} disabled={saving} onChange={(event) => changeValue('offer', event.target.checked)} />
              Produto em oferta
            </label>

            {saveError && <p className="admin-error" role="alert">{saveError}</p>}
            <button className="admin-primary" type="submit" disabled={saving || !categories.length}>
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Adicionar produto'}
            </button>
            {saving ? <button className="admin-cancel" type="button" disabled>Cancelar</button> :
              <Link className="admin-cancel" to="/admin/produtos">Cancelar</Link>}
          </form>
        )}
    </section>
  );
}
