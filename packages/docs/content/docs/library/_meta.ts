import type { MetaRecord } from 'nextra';

/**
 * type MetaRecordValue =
 *  | TitleSchema
 *  | PageItemSchema
 *  | SeparatorSchema
 *  | MenuSchema
 *
 * type MetaRecord = Record<string, MetaRecordValue>
 */
const meta: MetaRecord = {
  options: 'Options',
  parser: 'Parser',
  validator: 'Validator',
  formatter: 'Formatter',
  styles: 'Styles',
};

export default meta;
