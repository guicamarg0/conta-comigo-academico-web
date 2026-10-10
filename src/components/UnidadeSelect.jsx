import { SelectPesquisavel } from "./SelectPesquisavel";
import React from "react";

export const unidadesMedida = [
  ["UN", "UN · Unidade"],
  ["Hora", "Hora"],
  ["Diária", "Diária"],
  ["MT", "MT · Metro"],
  ["M²", "M² · Metro quadrado"],
  ["KG", "KG · Quilograma"],
  ["LT", "LT · Litro"],
];

export function UnidadeSelect({
  value,
  onChange,
  label = "Unidade de medida",
  required = false,
  ...props
}) {
  return (
    <SelectPesquisavel
      {...props}
      aria-label={label}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      <option value="">Selecione a unidade</option>
      {unidadesMedida.map(([codigo, nome]) => (
        <option key={codigo} value={codigo}>
          {nome}
        </option>
      ))}
      {value && !unidadesMedida.some(([codigo]) => codigo === value) && (
        <option value={value}>{value}</option>
      )}
    </SelectPesquisavel>
  );
}
