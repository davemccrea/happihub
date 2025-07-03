defmodule Astrup.Repo.Migrations.ModifyPatientCaseDescriptions do
  use Ecto.Migration

  def change do
    alter table(:patient_cases) do
      add :quiz_description, :text
      add :explanation, :text
    end
  end
end
