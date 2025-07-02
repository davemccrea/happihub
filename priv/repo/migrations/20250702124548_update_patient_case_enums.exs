defmodule Astrup.Repo.Migrations.UpdatePatientCaseEnums do
  use Ecto.Migration

  def change do
    # Create enum types for primary_disorder and compensation
    execute(
      """
      CREATE TYPE primary_disorder AS ENUM (
        'normal',
        'respiratory_acidosis',
        'respiratory_alkalosis',
        'metabolic_acidosis',
        'metabolic_alkalosis',
        'not_determined'
      )
      """,
      "DROP TYPE primary_disorder"
    )

    execute(
      """
      CREATE TYPE compensation AS ENUM (
        'uncompensated',
        'partially_compensated',
        'fully_compensated'
      )
      """,
      "DROP TYPE compensation"
    )

    # Update columns to use the new enum types
    # First, we need to handle the conversion from string to enum
    execute(
      """
      ALTER TABLE patient_cases 
      ALTER COLUMN primary_disorder TYPE primary_disorder 
      USING CASE 
        WHEN primary_disorder IS NULL THEN NULL
        ELSE primary_disorder::primary_disorder
      END
      """,
      """
      ALTER TABLE patient_cases 
      ALTER COLUMN primary_disorder TYPE varchar(255)
      """
    )

    execute(
      """
      ALTER TABLE patient_cases 
      ALTER COLUMN compensation TYPE compensation 
      USING CASE 
        WHEN compensation IS NULL THEN NULL
        ELSE compensation::compensation
      END
      """,
      """
      ALTER TABLE patient_cases 
      ALTER COLUMN compensation TYPE varchar(255)
      """
    )
  end
end
