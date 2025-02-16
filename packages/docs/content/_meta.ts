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
  index: {
    type: 'page',
    display: 'hidden',
  },
  docs: {
    type: 'page',
    title: 'Documentation',
  },
  demo: {
    type: 'page',
    title: 'Demo',
  },
  play: {
    type: 'page',
    title: 'Play',
  },
  api: {
    type: 'page',
    title: 'API',
    href: '/api/index.html',
  },
};

export default meta;
