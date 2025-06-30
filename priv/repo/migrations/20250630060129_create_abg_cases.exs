defmodule Astrup.Repo.Migrations.CreateAbgCases do
  use Ecto.Migration

  def change do
    create table(:abg_cases) do
      add :scenario, :string
      add :ph, :decimal
      add :pco2, :decimal
      add :po2, :decimal
      add :bicarbonate, :decimal
      add :base_excess, :decimal
      add :age, :integer
      add :sex, :string
      add :case_summary, :text
      add :primary_disorder, :string
      add :compensation, :string

      timestamps(type: :utc_datetime)
    end
  end
end
