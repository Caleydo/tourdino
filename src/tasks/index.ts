export * from './ATouringTask';

import {RowComparison} from './RowComparisonTask';
import {ColumnComparison} from './ColumnComparisonTask';

export const tasks = [
  new RowComparison(),
  new ColumnComparison(),
].sort((a, b) => b.order - a.order); // sort descending
