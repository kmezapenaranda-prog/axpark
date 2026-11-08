import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDetectors1794167603307 implements MigrationInterface {
    name = 'AddDetectors1794167603307'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."detectors_status_enum" AS ENUM('active', 'revoked')`);
        await queryRunner.query(`CREATE TABLE "detectors" ("id" SERIAL NOT NULL, "tenant_id" integer NOT NULL, "name" character varying(80) NOT NULL, "key_prefix" character varying(16) NOT NULL, "key_hash" character varying(64) NOT NULL, "status" "public"."detectors_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_seen_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_1f87d23fee2d1cd6c8fd86c9190" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_99b9be09f1f5751d5ed241cca1" ON "detectors" ("key_hash") `);
        await queryRunner.query(`ALTER TABLE "detectors" ADD CONSTRAINT "FK_85ea927fac92a0ad58afc630178" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "detectors" DROP CONSTRAINT "FK_85ea927fac92a0ad58afc630178"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_99b9be09f1f5751d5ed241cca1"`);
        await queryRunner.query(`DROP TABLE "detectors"`);
        await queryRunner.query(`DROP TYPE "public"."detectors_status_enum"`);
    }

}
