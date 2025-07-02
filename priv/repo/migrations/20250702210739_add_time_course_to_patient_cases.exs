defmodule Astrup.Repo.Migrations.AddTimeCourseToPatientCases do
  use Ecto.Migration

  def change do
    alter table(:patient_cases) do
      add :time_course, :string
    end
  end
end
