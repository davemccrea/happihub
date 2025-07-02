defmodule Astrup.Repo.Migrations.RenamePatientCaseFields do
  use Ecto.Migration

  def change do
    rename table(:patient_cases), :scenario, to: :summary
    rename table(:patient_cases), :case_summary, to: :description
  end
end