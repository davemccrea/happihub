defmodule Astrup.Repo.Migrations.RenameUserSettingsToSettings do
  use Ecto.Migration

  def change do
    rename table(:user_settings), to: table(:settings)
  end
end
