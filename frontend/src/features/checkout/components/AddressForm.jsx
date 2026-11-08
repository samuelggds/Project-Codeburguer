import { useState } from 'react';

const states = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const fields = [
  { key: 'street', label: 'Rua', autoComplete: 'address-line1', maxLength: 100 },
  { key: 'number', label: 'Número', maxLength: 12 },
  { key: 'complement', label: 'Complemento (opcional)', autoComplete: 'address-line2', optional: true, maxLength: 80 },
  { key: 'neighborhood', label: 'Bairro', maxLength: 80 },
  { key: 'postalCode', label: 'CEP', autoComplete: 'postal-code', inputMode: 'numeric', pattern: '[0-9]{5}-?[0-9]{3}', placeholder: '00000-000', maxLength: 9 },
  { key: 'city', label: 'Cidade', autoComplete: 'address-level2', maxLength: 80 },
];

export default function AddressForm({ address, onSave, onCancel }) {
  const [draft, setDraft] = useState(address || {});

  function submit(event) {
    event.preventDefault();
    onSave(Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()])));
  }

  return (
    <form className="checkout-address-form" onSubmit={submit}>
      <p className="checkout-form-note">Use um endereço de exemplo para testar a demonstração.</p>
      <div className="checkout-address-fields">
        {fields.map(({ key, label, optional, ...attributes }, index) => (
          <label key={key}>{label}
            <input {...attributes} name={key} value={draft[key] || ''} required={!optional}
              pattern={attributes.pattern || (optional ? undefined : '.*\\S.*')} autoFocus={index === 0}
              title={key === 'postalCode' ? 'Informe um CEP com 8 dígitos.' : undefined}
              onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
          </label>
        ))}
        <label><span id="checkout-state-label">Estado</span>
          <select name="state" value={draft.state || ''} required autoComplete="address-level1" aria-labelledby="checkout-state-label"
            onChange={(event) => setDraft({ ...draft, state: event.target.value })}>
            <option value="">Selecione a UF</option>
            {states.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
        </label>
      </div>
      <div className="checkout-form-actions">
        <button className="checkout-primary" type="submit">Salvar endereço</button>
        <button className="checkout-link" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
