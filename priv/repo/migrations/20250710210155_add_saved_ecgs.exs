defmodule Astrup.Repo.Migrations.AddSavedEcgs do
  use Ecto.Migration

  def change do
    create table(:saved_ecgs) do
      add :db_name, :string
      add :filename, :string
      add :user_id, references(:users, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime)
    end

    create unique_index(:saved_ecgs, [:db_name, :filename, :user_id])
  end
end
