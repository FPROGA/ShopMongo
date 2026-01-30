exports.up = function (knex) {
  return knex.schema.createTable("orders", (table) => {
    table.increments("id").primary();
    table.integer("user_id").notNullable();
    table.foreign("user_id").references("users.id");
    table.decimal("total_price", 10, 2);
    table.string("status", 255);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("orders");
};
