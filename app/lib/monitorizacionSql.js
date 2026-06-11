/**
 * SQL para resolver cliente desde aviso/warning.
 * OUTER APPLY TOP 1 evita o erro "Subquery returned more than 1 value"
 * cando hai varias filas en _MANMaintenanceWarning_Custom por aviso.
 *
 * CodCompany = '001' (mesma empresa que filtra a vista TGM_MONITORIZACION):
 * necesario para que SQL Server use o índice IX_MANMaintenanceWarning
 * (CodCompany, MaintenanceWarningCode). Sen el: scan, ~4x máis lento.
 */

export const OUTER_APPLY_WARNING_CLIENT = `
OUTER APPLY (
  SELECT TOP 1
    c2w.Description AS WarnCustName,
    p2w.CompanyName AS WarnPotName,
    p3w.CompanyName AS WarnPotAltName
  FROM MANMaintenanceWarning wcx WITH (NOLOCK)
  INNER JOIN _MANMaintenanceWarning_Custom wcc WITH (NOLOCK)
    ON wcx.IDMaintenanceWarning = wcc.IDMaintenanceWarning
  LEFT JOIN FACCustomer c2w WITH (NOLOCK) ON wcc.IDCliente = c2w.IDCustomer
  LEFT JOIN FACPotentialCustomerSL p2w WITH (NOLOCK)
    ON wcc.IDCliente = p2w.IDPotentialCustomer
  LEFT JOIN FACPotentialCustomerSL p3w WITH (NOLOCK)
    ON wcc.IDClientePotencial = p3w.IDPotentialCustomer
  WHERE wcx.CodCompany = '001' AND wcx.MaintenanceWarningCode = m.aviso
  ORDER BY wcc.IDMaintenanceWarning
) warnCli`;

export const CLIENTE_RESOLVED_COLUMN =
  'ISNULL(m.cliente, ISNULL(warnCli.WarnCustName, ISNULL(warnCli.WarnPotName, warnCli.WarnPotAltName))) AS cliente';

/**
 * EXISTS para filtrar por nome de cliente sen multiplicar filas do JOIN principal.
 * @param {string[]} paramNames - nomes dos parámetros @cliente0, @cliente1, ...
 */
export function buildClienteWarningExistsClause(paramNames) {
  const wordConditions = paramNames
    .map(
      (name) =>
        `(c2f.Description LIKE @${name} OR p2f.CompanyName LIKE @${name} OR p3f.CompanyName LIKE @${name})`
    )
    .join(' AND ');

  return `EXISTS (
    SELECT 1
    FROM MANMaintenanceWarning wcf WITH (NOLOCK)
    INNER JOIN _MANMaintenanceWarning_Custom wccf WITH (NOLOCK)
      ON wcf.IDMaintenanceWarning = wccf.IDMaintenanceWarning
    LEFT JOIN FACCustomer c2f WITH (NOLOCK) ON wccf.IDCliente = c2f.IDCustomer
    LEFT JOIN FACPotentialCustomerSL p2f WITH (NOLOCK)
      ON wccf.IDCliente = p2f.IDPotentialCustomer
    LEFT JOIN FACPotentialCustomerSL p3f WITH (NOLOCK)
      ON wccf.IDClientePotencial = p3f.IDPotentialCustomer
    WHERE wcf.CodCompany = '001' AND wcf.MaintenanceWarningCode = m.aviso
    AND (${wordConditions})
  )`;
}
