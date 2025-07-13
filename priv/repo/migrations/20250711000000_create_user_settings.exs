defmodule Astrup.Repo.Migrations.CreateUserSettings do
  use Ecto.Migration

  def change do
    create table(:user_settings) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :display_mode, :string, default: "single"
      add :current_lead, :integer, default: 1
      add :grid_scale, :float, default: 1.0
      add :amplitude_scale, :float, default: 1.0
      add :height_scale, :float, default: 1.2
      add :grid_type, :string, default: "telemetry"
      add :loop_playback, :boolean, default: true
      add :qrs_indicator, :boolean, default: true
      add :show_diagnostics, :boolean, default: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:user_settings, [:user_id])
  end
end
