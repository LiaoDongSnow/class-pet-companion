import { pgTable, serial, varchar, integer, text, timestamp, boolean, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ============ 学生信息表 ============
export const students = pgTable(
  "students",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 100 }).notNull(),
    class_name: varchar("class_name", { length: 100 }).notNull(),
    student_no: varchar("student_no", { length: 50 }),
    avatar_emoji: varchar("avatar_emoji", { length: 10 }).default("🧑‍🎓"),
    total_points: integer("total_points").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("students_class_name_idx").on(table.class_name),
    index("students_total_points_idx").on(table.total_points),
  ]
);

// ============ 宠物预设目录表 ============
export const pets = pgTable(
  "pets",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 100 }).notNull(),
    species: varchar("species", { length: 50 }).notNull(),
    emoji: varchar("emoji", { length: 10 }).notNull(),
    description: text("description"),
    base_health: integer("base_health").notNull().default(80),
    base_happiness: integer("base_happiness").notNull().default(80),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

// ============ 学生领养宠物表 ============
export const studentPets = pgTable(
  "student_pets",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    student_id: varchar("student_id", { length: 36 }).notNull().references(() => students.id, { onDelete: "cascade" }),
    pet_id: varchar("pet_id", { length: 36 }).notNull().references(() => pets.id, { onDelete: "cascade" }),
    nickname: varchar("nickname", { length: 100 }),
    health: integer("health").notNull().default(80),
    happiness: integer("happiness").notNull().default(80),
    hunger: integer("hunger").notNull().default(20),
    last_fed_at: timestamp("last_fed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("student_pets_student_id_idx").on(table.student_id),
    index("student_pets_pet_id_idx").on(table.pet_id),
  ]
);

// ============ 积分记录表 ============
export const pointRecords = pgTable(
  "point_records",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    student_id: varchar("student_id", { length: 36 }).notNull().references(() => students.id, { onDelete: "cascade" }),
    points: integer("points").notNull(),
    reason: varchar("reason", { length: 200 }),
    type: varchar("type", { length: 20 }).notNull().default("award"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("point_records_student_id_idx").on(table.student_id),
    index("point_records_type_idx").on(table.type),
    index("point_records_created_at_idx").on(table.created_at),
  ]
);
