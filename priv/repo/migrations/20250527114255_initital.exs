defmodule Astrup.Repo.Migrations.Initital do
  use Ecto.Migration

  def change do
    create table(:printouts) do
      add :ph, :decimal, null: false
      add :pco2, :decimal, null: false
      add :po2, :decimal, null: false
      add :bicarbonate, :decimal, null: false
      add :base_excess, :decimal, null: false
      add :anion_gap, :decimal, null: false
      add :hemoglobin, :decimal, null: false
      add :oxygen_content, :decimal, null: false
      add :oxygen_saturation, :decimal, null: false
      add :carboxyhemoglobin, :decimal, null: false
      add :methemoglobin, :decimal, null: false
      add :potassium, :decimal, null: false
      add :sodium, :decimal, null: false
      add :ionized_calcium, :decimal, null: false
      add :ionized_calcium_corrected_to_ph_7_4, :decimal, null: false
      add :chloride, :decimal, null: false
      add :glucose, :decimal, null: false
      add :lactate, :decimal, null: false
      add :age, :integer
      add :sex, :string

      timestamps()
    end
  end
end
