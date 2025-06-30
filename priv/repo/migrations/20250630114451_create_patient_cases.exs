defmodule Astrup.Repo.Migrations.CreatePatientCases do
  use Ecto.Migration

  def change do
    create table(:patient_cases) do
      # From Case schema (abg_cases)
      add :scenario, :string
      add :case_summary, :text
      add :primary_disorder, :string
      add :compensation, :string
      
      # Shared fields from both schemas
      add :ph, :decimal, null: false
      add :pco2, :decimal, null: false
      add :po2, :decimal, null: false
      add :bicarbonate, :decimal, null: false
      add :base_excess, :decimal, null: false
      add :age, :integer
      add :sex, :string
      
      # From Printout schema (additional lab values)
      add :anion_gap, :decimal
      add :hemoglobin, :decimal
      add :oxygen_content, :decimal
      add :oxygen_saturation, :decimal
      add :carboxyhemoglobin, :decimal
      add :methemoglobin, :decimal
      add :potassium, :decimal
      add :sodium, :decimal
      add :ionized_calcium, :decimal
      add :ionized_calcium_corrected_to_ph_7_4, :decimal
      add :chloride, :decimal
      add :glucose, :decimal
      add :lactate, :decimal
      add :checked_at, :utc_datetime
      
      # New field for case type
      add :case_type, :string, default: "reference"  # "reference", "interpretation", "mixed"

      timestamps(type: :utc_datetime)
    end
  end
end
