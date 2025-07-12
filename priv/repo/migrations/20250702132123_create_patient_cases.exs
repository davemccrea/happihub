defmodule Astrup.Repo.Migrations.CreatePatientCases do
  use Ecto.Migration

  def change do
    create table(:patient_cases) do
      # Clinical presentation information
      add :scenario, :text
      add :case_summary, :text
      add :primary_disorder, :string
      add :compensation, :string

      # Blood gas analysis values
      add :ph, :decimal, precision: 10, scale: 3
      add :pco2, :decimal, precision: 10, scale: 3
      add :po2, :decimal, precision: 10, scale: 3
      add :bicarbonate, :decimal, precision: 10, scale: 3
      add :base_excess, :decimal, precision: 10, scale: 3

      # Patient demographics
      add :age, :integer
      add :sex, :string

      # Extended lab values
      add :anion_gap, :decimal, precision: 10, scale: 3
      add :hemoglobin, :decimal, precision: 10, scale: 3
      add :oxygen_content, :decimal, precision: 10, scale: 3
      add :oxygen_saturation, :decimal, precision: 10, scale: 3
      add :carboxyhemoglobin, :decimal, precision: 10, scale: 3
      add :methemoglobin, :decimal, precision: 10, scale: 3
      add :potassium, :decimal, precision: 10, scale: 3
      add :sodium, :decimal, precision: 10, scale: 3
      add :ionized_calcium, :decimal, precision: 10, scale: 3
      add :ionized_calcium_corrected_to_ph_7_4, :decimal, precision: 10, scale: 3
      add :chloride, :decimal, precision: 10, scale: 3
      add :glucose, :decimal, precision: 10, scale: 3
      add :lactate, :decimal, precision: 10, scale: 3

      # Tracking fields
      add :checked_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    # Create indexes for better query performance
    create index(:patient_cases, [:primary_disorder])
    create index(:patient_cases, [:compensation])
    create index(:patient_cases, [:checked_at])
  end
end
