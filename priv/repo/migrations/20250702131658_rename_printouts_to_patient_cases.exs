defmodule Astrup.Repo.Migrations.RenamePrintoutsToPatientCases do
  use Ecto.Migration

  def change do
    rename table(:printouts), to: table(:patient_cases)
  end
end
