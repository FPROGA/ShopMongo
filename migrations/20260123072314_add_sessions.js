exports.up = function (knex) {
  return knex.schema.createTable("sessions", (table) => {
    table.increments("id").primary();
    table.string("session_id").notNullable().unique();
    table.integer("user_id").notNullable();
    table.foreign("user_id").references("users");
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("sessions");
};
