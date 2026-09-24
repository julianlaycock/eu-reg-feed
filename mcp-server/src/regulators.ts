/**
 * Static registry of regulators the parent project targets, working or not.
 *
 * This is descriptive metadata for `list_sources`, kept in sync by hand with
 * the "Currently supported sources" table in the parent repo's README. It is
 * intentionally separate from `sources[]` in a feed document, which reports
 * what actually ran on a given day (event counts, errors, fetch time) rather
 * than what the project targets in principle.
 */

import type { RegulatorId } from './schema.js';

export interface RegulatorDescriptor {
  id: RegulatorId;
  name: string;
  jurisdiction: string;
  method: string;
  status: 'working' | 'planned';
}

export const KNOWN_REGULATORS: RegulatorDescriptor[] = [
  {
    id: 'esma',
    name: 'European Securities and Markets Authority',
    jurisdiction: 'EU',
    method: 'HTML scraping (consultations page; RSS covers news only)',
    status: 'working',
  },
  {
    id: 'eba',
    name: 'European Banking Authority',
    jurisdiction: 'EU',
    method: 'Native RSS',
    status: 'working',
  },
  {
    id: 'cssf',
    name: 'Commission de Surveillance du Secteur Financier',
    jurisdiction: 'LU',
    method: 'Native RSS',
    status: 'working',
  },
  {
    id: 'eiopa',
    name: 'European Insurance and Occupational Pensions Authority',
    jurisdiction: 'EU',
    method: 'Planned',
    status: 'planned',
  },
  {
    id: 'eurlex',
    name: 'EUR-Lex',
    jurisdiction: 'EU',
    method: 'CELLAR/SPARQL',
    status: 'planned',
  },
  {
    id: 'bafin',
    name: 'Bundesanstalt für Finanzdienstleistungsaufsicht',
    jurisdiction: 'DE',
    method: 'HTML scraping',
    status: 'planned',
  },
  {
    id: 'amf',
    name: 'Autorité des Marchés Financiers',
    jurisdiction: 'FR',
    method: 'Planned',
    status: 'planned',
  },
  {
    id: 'cnmv',
    name: 'Comisión Nacional del Mercado de Valores',
    jurisdiction: 'ES',
    method: 'Planned',
    status: 'planned',
  },
  {
    id: 'fma_at',
    name: 'Finanzmarktaufsicht Österreich',
    jurisdiction: 'AT',
    method: 'Planned',
    status: 'planned',
  },
];
