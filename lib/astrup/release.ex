defmodule Astrup.Release do
  @moduledoc """
  Used for executing DB release tasks when run in production without Mix
  installed.
  """
  @app :astrup

  def migrate do
    load_app()

    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  def rollback(repo, version) do
    load_app()
    {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
  end

  def seed do
    load_app()
    seed_patient_cases()
  end

  defp seed_patient_cases do
    for repo <- repos() do
      now = DateTime.truncate(DateTime.utc_now(), :second)

      {:ok, _, _} =
        Ecto.Migrator.with_repo(repo, fn repo ->
          # Clear existing patient cases
          repo.delete_all(Astrup.PatientCase)

          repo.insert_all(
            Astrup.PatientCase,
            [
              # Reference cases with full lab data (from printouts)
              # COPD
              %{
                summary: "copd_exacerbation",
                ph: Decimal.new("7.335"),
                pco2: Decimal.new("8.9"),
                po2: Decimal.new("6.7"),
                bicarbonate: Decimal.new("30.5"),
                base_excess: Decimal.new("2.8"),
                anion_gap: Decimal.new("14.2"),
                hemoglobin: Decimal.new("135"),
                oxygen_content: Decimal.new("12.1"),
                oxygen_saturation: Decimal.new("85.3"),
                carboxyhemoglobin: Decimal.new("1.8"),
                methemoglobin: Decimal.new("0.9"),
                potassium: Decimal.new("4.1"),
                sodium: Decimal.new("138"),
                ionized_calcium: Decimal.new("1.15"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.18"),
                chloride: Decimal.new("99"),
                glucose: Decimal.new("7.2"),
                lactate: Decimal.new("1.9"),
                inserted_at: now,
                updated_at: now,
                checked_at: now
              }
            ]
          )
        end)
    end
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp load_app do
    # Many platforms require SSL when connecting to the database
    Application.ensure_all_started(:ssl)
    Application.ensure_loaded(@app)
  end
end
