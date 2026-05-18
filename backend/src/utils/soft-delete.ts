export type SoftDeleteFilter = {
  deletedAt: null;
};

export type SoftDeleteData = {
  deletedAt: Date;
};

export const onlyActive = {
  deletedAt: null,
} satisfies SoftDeleteFilter;

export function softDeleteData(date = new Date()): SoftDeleteData {
  return {
    deletedAt: date,
  };
}
