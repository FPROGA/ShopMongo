exports.up = function (knex) {
  return knex.schema.createTable("order_items", (table) => {
    table.increments("id").primary();
    table.integer("order_id").notNullable();
    table.foreign("order_id").references("orders");
    table.integer("product_id").notNullable();
    table.foreign("product_id").references("products");
    table.integer("quantity", 255).notNullable();
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("order_items");
};
