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
  index: 'Introduction',
  library: 'Library',
  guides: 'Guides',
};

export default meta;
