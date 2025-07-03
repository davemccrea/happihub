defmodule Astrup.Repo.Migrations.AddSettingsToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :laboratory, :string, default: "Astrup.Lab.Fimlab"
      add :analyzer, :string, default: "Astrup.Analyzer.RadiometerAbl90FlexPlus"
    end
  end
end
