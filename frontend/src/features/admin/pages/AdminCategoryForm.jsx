import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminApi, categoryImageUrl } from '../api.js';
import { MAX_IMAGE_BYTES } from '../utils.js';
import { getApiError } from '../../../services/authService.js';
import AdminIcon from '../components/AdminIcon.jsx';

const imageTypes = ['image/png', 'image/jpeg', 'image/webp'];
const emptyForm = { name: '', description: '' };

export default function AdminCategoryForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [values, setValues] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [loading, setLoading] = useState(editing);
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
    setLoading(editing);
    setLoadError('');
    setSaveError('');
    setErrors({});
    setCategory(null);
    setValues(emptyForm);
    setFile(null);
    setImageFailed(false);
    if (fileInput.current) fileInput.current.value = '';
    setSaving(false);
    savingRef.current = false;

    if (editing) {
      adminApi.getCategory(id, { signal: controller.signal }).then((nextCategory) => {
        if (controller.signal.aborted) return;
        setCategory(nextCategory);
        setValues({ name: nextCategory.name || '', description: nextCategory.description || '' });
      }).catch((error) => {
        if (!controller.signal.aborted) setLoadError(getApiError(error));
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }

    return () => {
      controller.abort();
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
    const description = values.description.trim();
    const nextErrors = {};
    if (name.length < 2 || name.length > 120) nextErrors.name = 'Informe um nome de 2 a 120 caracteres.';
    if (!editing && !description) nextErrors.description = 'Informe uma descrição para a categoria.';
    else if (description.length > 500) nextErrors.description = 'A descrição deve ter no máximo 500 caracteres.';
    if (!editing && !file) nextErrors.file = errors.file || 'Selecione uma imagem para a categoria.';
    else if (errors.file) nextErrors.file = errors.file;

    setErrors(nextErrors);
    setSaveError('');
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }

    const data = new FormData();
    data.append('name', name);
    data.append('description', description);
    if (file) data.append('file', file);
    const version = requestVersion.current;
    savingRef.current = true;
    setSaving(true);
    try {
      if (editing) await adminApi.updateCategory(id, data);
      else await adminApi.createCategory(data);
      if (requestVersion.current !== version) return;
      navigate('/admin/categorias', {
        replace: true,
        state: { notice: editing ? 'Categoria atualizada com sucesso.' : 'Categoria cadastrada com sucesso.' },
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

  const title = editing ? 'Editar categoria' : 'Cadastrar categoria';
  const image = preview || (category ? categoryImageUrl(category) : '');

  return (
    <section className="admin-product-editor" aria-labelledby="admin-category-form-heading">
      <h2 id="admin-category-form-heading" className="admin-sr-only">{title}</h2>
      {loading ? <p className="admin-empty" role="status">Carregando categoria...</p> :
        loadError ? (
          <div className="admin-empty">
            <p className="admin-error" role="alert">{loadError}</p>
            <button className="admin-primary" type="button" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</button>
            <Link className="admin-link" to="/admin/categorias">Voltar para categorias</Link>
          </div>
        ) : (
          <form className="admin-product-form admin-category-form" ref={form} onSubmit={submit} noValidate aria-busy={saving}>
            <label htmlFor="admin-category-name">Nome</label>
            <input id="admin-category-name" name="name" value={values.name} maxLength={120} required disabled={saving}
              aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'admin-category-name-error' : undefined}
              onChange={(event) => changeValue('name', event.target.value)} />
            {errors.name && <p className="admin-field-error" id="admin-category-name-error">{errors.name}</p>}

            <label htmlFor="admin-category-description">Descrição</label>
            <textarea id="admin-category-description" name="description" value={values.description} rows={4} maxLength={500} required={!editing} disabled={saving}
              aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'admin-category-description-error' : 'admin-category-description-help'}
              onChange={(event) => changeValue('description', event.target.value)} />
            {errors.description && <p className="admin-field-error" id="admin-category-description-error">{errors.description}</p>}
            <p className="admin-form-help" id="admin-category-description-help">Apresente esta categoria aos clientes. Até 500 caracteres.</p>

            <div className="admin-product-upload">
              {image && !imageFailed && <img className="admin-image-preview" src={image} alt="Prévia da categoria" onError={() => setImageFailed(true)} />}
              {image && imageFailed && <p className="admin-file-note">Não foi possível exibir a imagem atual.</p>}
              <label className="admin-upload-button" htmlFor="admin-category-image">
                <AdminIcon name="image" />
                {editing ? 'Trocar imagem da categoria' : 'Carregar imagem da categoria'}
              </label>
              <input ref={fileInput} className="admin-file-input" id="admin-category-image" name="image" type="file"
                accept="image/png,image/jpeg,image/webp" aria-label="Imagem da categoria" disabled={saving} required={!editing}
                aria-invalid={Boolean(errors.file)} aria-describedby={errors.file ? 'admin-category-image-error' : 'admin-category-image-help'}
                onChange={chooseImage} />
              <p className="admin-file-note" id="admin-category-image-help">
                {file ? file.name : editing ? 'Sem nova imagem, a foto atual será mantida.' : 'PNG, JPG ou WebP, até 5 MB.'}
              </p>
              {errors.file && <p className="admin-field-error" id="admin-category-image-error">{errors.file}</p>}
            </div>

            {saveError && <p className="admin-error" role="alert">{saveError}</p>}
            <button className="admin-primary" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Adicionar categoria'}
            </button>
            {saving ? <button className="admin-cancel" type="button" disabled>Cancelar</button> :
              <Link className="admin-cancel" to="/admin/categorias">Cancelar</Link>}
          </form>
        )}
    </section>
  );
}
