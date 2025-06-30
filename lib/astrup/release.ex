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
                scenario: "copd_exacerbation",
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
                case_type: "reference",
                inserted_at: now,
                updated_at: now,
                checked_at: now
              },
              # DKA
              %{
                scenario: "dka",
                ph: Decimal.new("7.152"),
                pco2: Decimal.new("3.1"),
                po2: Decimal.new("13.5"),
                bicarbonate: Decimal.new("8.5"),
                base_excess: Decimal.new("-18.7"),
                anion_gap: Decimal.new("25.3"),
                hemoglobin: Decimal.new("155"),
                oxygen_content: Decimal.new("18.2"),
                oxygen_saturation: Decimal.new("95.9"),
                carboxyhemoglobin: Decimal.new("0.6"),
                methemoglobin: Decimal.new("0.8"),
                potassium: Decimal.new("5.8"),
                sodium: Decimal.new("130"),
                ionized_calcium: Decimal.new("1.10"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.19"),
                chloride: Decimal.new("90"),
                glucose: Decimal.new("28.5"),
                lactate: Decimal.new("4.2"),
                case_type: "reference",
                inserted_at: now,
                updated_at: now,
                checked_at: now
              },

              # Interpretation cases with clinical scenarios (from abg_cases)
              # COPD exacerbation - respiratory acidosis with partial compensation
              %{
                scenario: "copd_exacerbation",
                ph: Decimal.new("7.32"),
                pco2: Decimal.new("7.2"),
                po2: Decimal.new("8.5"),
                bicarbonate: Decimal.new("28"),
                base_excess: Decimal.new("3"),
                age: 65,
                sex: "male",
                case_summary:
                  "A 65-year-old male presents to the emergency department with worsening shortness of breath over the past 3 days. He has a history of COPD and is a current smoker. Physical examination reveals use of accessory muscles, prolonged expiration, and decreased breath sounds bilaterally. The patient appears drowsy and confused.",
                primary_disorder: "Respiratory acidosis",
                compensation: "Partially compensated",
                case_type: "interpretation",
                inserted_at: now,
                updated_at: now
              },
              # Diabetic ketoacidosis - metabolic acidosis with respiratory compensation
              %{
                scenario: "dka",
                ph: Decimal.new("7.22"),
                pco2: Decimal.new("3.8"),
                po2: Decimal.new("12.5"),
                bicarbonate: Decimal.new("15"),
                base_excess: Decimal.new("-12"),
                age: 28,
                sex: "female",
                case_summary:
                  "A 28-year-old female with type 1 diabetes is brought in by ambulance after being found unconscious at home. Family reports the patient has been unwell with flu-like symptoms for several days and may have missed insulin doses. The patient is dehydrated with fruity breath odor and Kussmaul respirations.",
                primary_disorder: "Metabolic acidosis",
                compensation: "Partially compensated",
                case_type: "interpretation",
                inserted_at: now,
                updated_at: now
              },
              # Anxiety/panic attack - respiratory alkalosis
              %{
                scenario: "anxiety",
                ph: Decimal.new("7.52"),
                pco2: Decimal.new("3.2"),
                po2: Decimal.new("13.8"),
                bicarbonate: Decimal.new("22"),
                base_excess: Decimal.new("-1"),
                age: 25,
                sex: "female",
                case_summary:
                  "A 25-year-old female presents to the emergency department with sudden onset of chest tightness, palpitations, and feeling short of breath. The patient appears anxious and reports tingling in fingers and around the mouth. No significant medical history. Symptoms started during a stressful work meeting.",
                primary_disorder: "Respiratory alkalosis",
                compensation: "Uncompensated",
                case_type: "interpretation",
                inserted_at: now,
                updated_at: now
              },

              # Mixed cases with both lab data and clinical context
              %{
                scenario: "normal",
                ph: Decimal.new("7.405"),
                pco2: Decimal.new("5.32"),
                po2: Decimal.new("12.8"),
                bicarbonate: Decimal.new("24.5"),
                base_excess: Decimal.new("0.1"),
                anion_gap: Decimal.new("10.0"),
                hemoglobin: Decimal.new("138"),
                oxygen_content: Decimal.new("18.6"),
                oxygen_saturation: Decimal.new("97.5"),
                carboxyhemoglobin: Decimal.new("0.8"),
                methemoglobin: Decimal.new("0.6"),
                potassium: Decimal.new("4.2"),
                sodium: Decimal.new("140"),
                ionized_calcium: Decimal.new("1.22"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.22"),
                chloride: Decimal.new("103"),
                glucose: Decimal.new("5.1"),
                lactate: Decimal.new("0.9"),
                age: 35,
                sex: "male",
                case_summary:
                  "A 35-year-old male undergoing elective surgery. Pre-operative assessment shows the patient is healthy with no significant medical history. Vital signs are stable and the patient is breathing room air comfortably.",
                primary_disorder: "Normal acid-base balance",
                compensation: nil,
                case_type: "mixed",
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
