defmodule Astrup.Repo.Migrations.RemoveCaseTypeFromPatientCases do
  use Ecto.Migration

  def change do
    alter table(:patient_cases) do
      remove :case_type, :string
    end
  end
end
