// Esquema base de AxPark (todas las tablas existentes antes de los detectores).
import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1794167420579 implements MigrationInterface {
    name = 'InitialSchema1794167420579'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Bases creadas antes de usar migraciones (con synchronize) ya tienen este esquema:
        // en ese caso no hay nada que crear y la migración solo queda marcada como aplicada.
        if (await queryRunner.hasTable('tenants')) return;

        await queryRunner.query(`CREATE TYPE "public"."tenants_status_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "tenants" ("id" SERIAL NOT NULL, "name" character varying(150) NOT NULL, "contact_email" character varying, "contact_phone" character varying(20), "status" "public"."tenants_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_32731f181236a46182a38c992a" ON "tenants" ("name") `);
        await queryRunner.query(`CREATE TYPE "public"."clients_status_enum" AS ENUM('active', 'inactive', 'blocked')`);
        await queryRunner.query(`CREATE TABLE "clients" ("id" SERIAL NOT NULL, "tenant_id" integer NOT NULL, "full_name" character varying(150) NOT NULL, "document" character varying(20) NOT NULL, "phone" character varying(20), "email" character varying, "address" character varying, "status" "public"."clients_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_82d01c074478a0a41db59bd819" ON "clients" ("tenant_id", "document") `);
        await queryRunner.query(`CREATE TYPE "public"."memberships_status_enum" AS ENUM('active', 'expired', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "memberships" ("id" SERIAL NOT NULL, "tenant_id" integer NOT NULL, "vehicle_id" integer NOT NULL, "client_id" integer NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "status" "public"."memberships_status_enum" NOT NULL DEFAULT 'active', "price" numeric(10,2) NOT NULL, "auto_renew" boolean NOT NULL DEFAULT false, "paid_at" TIMESTAMP WITH TIME ZONE, "company" character varying(150), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_25d28bd932097a9e90495ede7b4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."vehicles_type_enum" AS ENUM('car', 'moto')`);
        await queryRunner.query(`CREATE TYPE "public"."vehicles_status_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "vehicles" ("id" SERIAL NOT NULL, "tenant_id" integer NOT NULL, "client_id" integer, "plate" character varying(10) NOT NULL, "type" "public"."vehicles_type_enum" NOT NULL, "brand" character varying(50), "color" character varying(30), "status" "public"."vehicles_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c4733933105567f385d5f6f624" ON "vehicles" ("tenant_id", "plate") `);
        await queryRunner.query(`CREATE TABLE "entries" ("id" SERIAL NOT NULL, "tenant_id" integer NOT NULL, "plate" character varying(10) NOT NULL, "entry_time" TIMESTAMP NOT NULL DEFAULT now(), "exit_time" TIMESTAMP WITH TIME ZONE, "amount_paid" integer, "vehicle_type" character varying(10), "vehicle_id" integer, "covered_by_membership" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_23d4e7e9b58d9939f113832915b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_entries_open" ON "entries" ("tenant_id", "plate") WHERE "exit_time" IS NULL`);
        await queryRunner.query(`CREATE TABLE "settings" ("id" SERIAL NOT NULL, "tenant_id" integer NOT NULL, "fraccion_carro" integer NOT NULL DEFAULT '700', "hora_carro" integer NOT NULL DEFAULT '2500', "medio_dia_carro" integer NOT NULL DEFAULT '10000', "dia_carro" integer NOT NULL DEFAULT '18000', "mensualidad_carro" integer NOT NULL DEFAULT '120000', "fraccion_moto" integer NOT NULL DEFAULT '400', "hora_moto" integer NOT NULL DEFAULT '1500', "medio_dia_moto" integer NOT NULL DEFAULT '6000', "dia_moto" integer NOT NULL DEFAULT '10000', "mensualidad_moto" integer NOT NULL DEFAULT '70000', CONSTRAINT "UQ_e65434954fe8a9ed32298b933a6" UNIQUE ("tenant_id"), CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('platform_admin', 'business_admin', 'operator')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "tenant_id" integer, "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "full_name" character varying(150) NOT NULL, "role" "public"."users_role_enum" NOT NULL, "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "clients" ADD CONSTRAINT "FK_e7d8b637725986e7b5fa774a3fd" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "memberships" ADD CONSTRAINT "FK_a9c14741084d57ac0ec0cb52af3" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "memberships" ADD CONSTRAINT "FK_179abd81734b48e44d0ccedc702" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "memberships" ADD CONSTRAINT "FK_e46119bc0fa8cf0e8987312a9cd" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD CONSTRAINT "FK_83421ac7781fdc9554f5256841d" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD CONSTRAINT "FK_4253172b7fcc8d1d90a6774502e" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "entries" ADD CONSTRAINT "FK_834b12e8b61247b872e8d7131bc" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "entries" ADD CONSTRAINT "FK_9b2583dc56b1db8746f6b70ccf4" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "settings" ADD CONSTRAINT "FK_e65434954fe8a9ed32298b933a6" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_109638590074998bb72a2f2cf08" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_109638590074998bb72a2f2cf08"`);
        await queryRunner.query(`ALTER TABLE "settings" DROP CONSTRAINT "FK_e65434954fe8a9ed32298b933a6"`);
        await queryRunner.query(`ALTER TABLE "entries" DROP CONSTRAINT "FK_9b2583dc56b1db8746f6b70ccf4"`);
        await queryRunner.query(`ALTER TABLE "entries" DROP CONSTRAINT "FK_834b12e8b61247b872e8d7131bc"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP CONSTRAINT "FK_4253172b7fcc8d1d90a6774502e"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP CONSTRAINT "FK_83421ac7781fdc9554f5256841d"`);
        await queryRunner.query(`ALTER TABLE "memberships" DROP CONSTRAINT "FK_e46119bc0fa8cf0e8987312a9cd"`);
        await queryRunner.query(`ALTER TABLE "memberships" DROP CONSTRAINT "FK_179abd81734b48e44d0ccedc702"`);
        await queryRunner.query(`ALTER TABLE "memberships" DROP CONSTRAINT "FK_a9c14741084d57ac0ec0cb52af3"`);
        await queryRunner.query(`ALTER TABLE "clients" DROP CONSTRAINT "FK_e7d8b637725986e7b5fa774a3fd"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`DROP INDEX "public"."uq_entries_open"`);
        await queryRunner.query(`DROP TABLE "entries"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c4733933105567f385d5f6f624"`);
        await queryRunner.query(`DROP TABLE "vehicles"`);
        await queryRunner.query(`DROP TYPE "public"."vehicles_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."vehicles_type_enum"`);
        await queryRunner.query(`DROP TABLE "memberships"`);
        await queryRunner.query(`DROP TYPE "public"."memberships_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_82d01c074478a0a41db59bd819"`);
        await queryRunner.query(`DROP TABLE "clients"`);
        await queryRunner.query(`DROP TYPE "public"."clients_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_32731f181236a46182a38c992a"`);
        await queryRunner.query(`DROP TABLE "tenants"`);
        await queryRunner.query(`DROP TYPE "public"."tenants_status_enum"`);
    }

}
