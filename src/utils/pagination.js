const paginate = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 12));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const paginatedResult = (items, totalItems, { page, limit }) => ({
  items,
  pagination: {
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
  },
});

module.exports = { paginate, paginatedResult };
