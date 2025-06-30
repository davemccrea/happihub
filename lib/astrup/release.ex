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
    seed_abg_cases()
    seed_printouts()
  end

  defp seed_printouts do
    for repo <- repos() do
      now = DateTime.truncate(DateTime.utc_now(), :second)

      {:ok, _, _} =
        Ecto.Migrator.with_repo(repo, fn repo ->
          # Clear existing printouts (commented out to preserve existing data)
          # repo.delete_all(Astrup.Printout)

          repo.insert_all(
            Astrup.Printout,
            [
              # COPD
              %{
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
              },
              # DKA
              %{
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
                inserted_at: now,
                updated_at: now,
                checked_at: now
              },
              # Spesis with lactic acidosis
              %{
                ph: Decimal.new("7.238"),
                pco2: Decimal.new("4.5"),
                po2: Decimal.new("8.9"),
                bicarbonate: Decimal.new("15.0"),
                base_excess: Decimal.new("-10.1"),
                anion_gap: Decimal.new("19.5"),
                hemoglobin: Decimal.new("110"),
                oxygen_content: Decimal.new("10.5"),
                oxygen_saturation: Decimal.new("89.0"),
                carboxyhemoglobin: Decimal.new("0.7"),
                methemoglobin: Decimal.new("1.1"),
                potassium: Decimal.new("4.9"),
                sodium: Decimal.new("133"),
                ionized_calcium: Decimal.new("1.08"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.14"),
                chloride: Decimal.new("100"),
                glucose: Decimal.new("9.8"),
                lactate: Decimal.new("7.5"),
                inserted_at: now,
                updated_at: now,
                checked_at: now
              },
              # Panic attack / hyperventilation
              %{
                ph: Decimal.new("7.553"),
                pco2: Decimal.new("3.4"),
                po2: Decimal.new("15.1"),
                bicarbonate: Decimal.new("23.8"),
                base_excess: Decimal.new("2.5"),
                anion_gap: Decimal.new("9.0"),
                hemoglobin: Decimal.new("128"),
                oxygen_content: Decimal.new("17.0"),
                oxygen_saturation: Decimal.new("98.5"),
                carboxyhemoglobin: Decimal.new("0.4"),
                methemoglobin: Decimal.new("0.6"),
                potassium: Decimal.new("3.3"),
                sodium: Decimal.new("140"),
                ionized_calcium: Decimal.new("1.05"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("0.98"),
                chloride: Decimal.new("105"),
                glucose: Decimal.new("5.9"),
                lactate: Decimal.new("1.0"),
                inserted_at: now,
                updated_at: now,
                checked_at: now
              },
              # Chronic Renal Failure
              %{
                ph: Decimal.new("7.325"),
                pco2: Decimal.new("4.7"),
                po2: Decimal.new("11.5"),
                bicarbonate: Decimal.new("17.2"),
                base_excess: Decimal.new("-6.0"),
                anion_gap: Decimal.new("16.1"),
                hemoglobin: Decimal.new("95"),
                oxygen_content: Decimal.new("9.9"),
                oxygen_saturation: Decimal.new("92.3"),
                carboxyhemoglobin: Decimal.new("0.8"),
                methemoglobin: Decimal.new("0.7"),
                potassium: Decimal.new("5.9"),
                sodium: Decimal.new("136"),
                ionized_calcium: Decimal.new("1.02"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.07"),
                chloride: Decimal.new("107"),
                glucose: Decimal.new("6.8"),
                lactate: Decimal.new("1.4"),
                inserted_at: now,
                updated_at: now,
                checked_at: now
              },
              # Salicylate overdose (early presentation)
              %{
                ph: Decimal.new("7.488"),
                pco2: Decimal.new("2.9"),
                po2: Decimal.new("14.8"),
                bicarbonate: Decimal.new("18.0"),
                base_excess: Decimal.new("-1.5"),
                anion_gap: Decimal.new("18.0"),
                hemoglobin: Decimal.new("140"),
                oxygen_content: Decimal.new("18.1"),
                oxygen_saturation: Decimal.new("97.8"),
                carboxyhemoglobin: Decimal.new("0.5"),
                methemoglobin: Decimal.new("0.6"),
                potassium: Decimal.new("3.7"),
                sodium: Decimal.new("142"),
                ionized_calcium: Decimal.new("1.16"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.10"),
                chloride: Decimal.new("108"),
                glucose: Decimal.new("7.1"),
                lactate: Decimal.new("3.1"),
                inserted_at: now,
                updated_at: now,
                checked_at: now
              },
              # Severe dehydration / hypovolemic shock
              %{
                ph: Decimal.new("7.291"),
                pco2: Decimal.new("4.0"),
                po2: Decimal.new("10.1"),
                bicarbonate: Decimal.new("14.5"),
                base_excess: Decimal.new("-9.2"),
                anion_gap: Decimal.new("17.8"),
                hemoglobin: Decimal.new("170"),
                oxygen_content: Decimal.new("17.5"),
                oxygen_saturation: Decimal.new("91.5"),
                carboxyhemoglobin: Decimal.new("0.7"),
                methemoglobin: Decimal.new("0.9"),
                potassium: Decimal.new("4.6"),
                sodium: Decimal.new("152"),
                ionized_calcium: Decimal.new("1.22"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.29"),
                chloride: Decimal.new("115"),
                glucose: Decimal.new("6.5"),
                lactate: Decimal.new("5.8"),
                inserted_at: now,
                updated_at: now,
                checked_at: now
              },
              # Carbon monoxide poisoning
              %{
                ph: Decimal.new("7.305"),
                pco2: Decimal.new("5.8"),
                po2: Decimal.new("35.2"),
                bicarbonate: Decimal.new("20.1"),
                base_excess: Decimal.new("-5.5"),
                anion_gap: Decimal.new("15.0"),
                hemoglobin: Decimal.new("142"),
                oxygen_content: Decimal.new("13.5"),
                oxygen_saturation: Decimal.new("98.8"),
                carboxyhemoglobin: Decimal.new("22.5"),
                methemoglobin: Decimal.new("1.0"),
                potassium: Decimal.new("4.0"),
                sodium: Decimal.new("139"),
                ionized_calcium: Decimal.new("1.17"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.23"),
                chloride: Decimal.new("103"),
                glucose: Decimal.new("8.0"),
                lactate: Decimal.new("3.9"),
                inserted_at: now,
                updated_at: now,
                checked_at: now
              },
              # Pulmonary embolism
              %{
                ph: Decimal.new("7.492"),
                pco2: Decimal.new("3.8"),
                po2: Decimal.new("7.9"),
                bicarbonate: Decimal.new("22.5"),
                base_excess: Decimal.new("1.3"),
                anion_gap: Decimal.new("10.5"),
                hemoglobin: Decimal.new("120"),
                oxygen_content: Decimal.new("12.0"),
                oxygen_saturation: Decimal.new("88.9"),
                carboxyhemoglobin: Decimal.new("0.6"),
                methemoglobin: Decimal.new("0.7"),
                potassium: Decimal.new("3.6"),
                sodium: Decimal.new("141"),
                ionized_calcium: Decimal.new("1.12"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.06"),
                chloride: Decimal.new("106"),
                glucose: Decimal.new("6.1"),
                lactate: Decimal.new("1.7"),
                inserted_at: now,
                updated_at: now,
                checked_at: now
              },
              # Patient on Optiflow (acute asthma attack - improving)
              %{
                ph: Decimal.new("7.431"),
                pco2: Decimal.new("5.0"),
                po2: Decimal.new("30.5"),
                bicarbonate: Decimal.new("24.8"),
                base_excess: Decimal.new("0.5"),
                anion_gap: Decimal.new("11.2"),
                hemoglobin: Decimal.new("133"),
                oxygen_content: Decimal.new("18.5"),
                oxygen_saturation: Decimal.new("99.5"),
                carboxyhemoglobin: Decimal.new("0.4"),
                methemoglobin: Decimal.new("0.5"),
                potassium: Decimal.new("3.8"),
                sodium: Decimal.new("137"),
                ionized_calcium: Decimal.new("1.18"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.17"),
                chloride: Decimal.new("102"),
                glucose: Decimal.new("7.9"),
                lactate: Decimal.new("1.5"),
                inserted_at: now,
                updated_at: now,
                checked_at: now
              },
              # Near-drowning incident (freshwater aspiration)
              %{
                ph: Decimal.new("7.189"),
                pco2: Decimal.new("7.5"),
                po2: Decimal.new("7.1"),
                bicarbonate: Decimal.new("19.5"),
                base_excess: Decimal.new("-8.8"),
                anion_gap: Decimal.new("16.5"),
                hemoglobin: Decimal.new("105"),
                oxygen_content: Decimal.new("8.5"),
                oxygen_saturation: Decimal.new("79.2"),
                carboxyhemoglobin: Decimal.new("0.9"),
                methemoglobin: Decimal.new("1.2"),
                potassium: Decimal.new("5.4"),
                sodium: Decimal.new("129"),
                ionized_calcium: Decimal.new("1.03"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.10"),
                chloride: Decimal.new("95"),
                glucose: Decimal.new("4.3"),
                lactate: Decimal.new("6.1"),
                inserted_at: now,
                updated_at: now,
                checked_at: now
              },
              # Normal
              %{
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
                inserted_at: now,
                updated_at: now,
                checked_at: now
              },
              # Normal
              %{
                ph: Decimal.new("7.388"),
                pco2: Decimal.new("5.59"),
                po2: Decimal.new("11.9"),
                bicarbonate: Decimal.new("25.1"),
                base_excess: Decimal.new("-0.5"),
                anion_gap: Decimal.new("11.5"),
                hemoglobin: Decimal.new("155"),
                oxygen_content: Decimal.new("20.1"),
                oxygen_saturation: Decimal.new("96.8"),
                carboxyhemoglobin: Decimal.new("1.1"),
                methemoglobin: Decimal.new("0.7"),
                potassium: Decimal.new("3.9"),
                sodium: Decimal.new("142"),
                ionized_calcium: Decimal.new("1.19"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.18"),
                chloride: Decimal.new("105"),
                glucose: Decimal.new("4.8"),
                lactate: Decimal.new("1.2"),
                inserted_at: now,
                updated_at: now,
                checked_at: now
              }
            ]
          )
        end)
    end
  end

  defp seed_abg_cases do
    for repo <- repos() do
      now = DateTime.truncate(DateTime.utc_now(), :second)

      {:ok, _, _} =
        Ecto.Migrator.with_repo(repo, fn repo ->
          # Clear existing cases
          repo.delete_all(Astrup.Case)

          repo.insert_all(
            Astrup.Case,
            [
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
                inserted_at: now,
                updated_at: now
              },
              # Pneumonia with sepsis - mixed disorder
              %{
                scenario: "pneumonia_sepsis",
                ph: Decimal.new("7.28"),
                pco2: Decimal.new("4.2"),
                po2: Decimal.new("9.8"),
                bicarbonate: Decimal.new("18"),
                base_excess: Decimal.new("-8"),
                age: 72,
                sex: "female",
                case_summary:
                  "A 72-year-old female is admitted from a nursing home with fever, productive cough, and altered mental status for 2 days. Vital signs show temperature 39.2°C, blood pressure 85/50 mmHg, heart rate 125 bpm. Chest X-ray shows right lower lobe consolidation.",
                primary_disorder: "Metabolic acidosis",
                compensation: "Partially compensated",
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
                inserted_at: now,
                updated_at: now
              },
              # Vomiting - metabolic alkalosis
              %{
                scenario: "vomiting",
                ph: Decimal.new("7.48"),
                pco2: Decimal.new("5.8"),
                po2: Decimal.new("11.2"),
                bicarbonate: Decimal.new("32"),
                base_excess: Decimal.new("8"),
                age: 45,
                sex: "male",
                case_summary:
                  "A 45-year-old male presents with 3 days of severe nausea and vomiting, unable to keep fluids down. The patient appears dehydrated with dry mucous membranes and decreased skin turgor. Reports feeling weak and dizzy when standing.",
                primary_disorder: "Metabolic alkalosis",
                compensation: "Partially compensated",
                inserted_at: now,
                updated_at: now
              },
              # Normal values
              %{
                scenario: "normal",
                ph: Decimal.new("7.38"),
                pco2: Decimal.new("5.1"),
                po2: Decimal.new("11.5"),
                bicarbonate: Decimal.new("24"),
                base_excess: Decimal.new("0"),
                age: 35,
                sex: "male",
                case_summary:
                  "A 35-year-old male undergoing elective surgery. Pre-operative assessment shows the patient is healthy with no significant medical history. Vital signs are stable and the patient is breathing room air comfortably.",
                primary_disorder: "Normal acid-base balance",
                compensation: nil,
                inserted_at: now,
                updated_at: now
              },
              # Additional respiratory acidosis case
              %{
                scenario: "respiratory_failure",
                ph: Decimal.new("7.25"),
                pco2: Decimal.new("8.1"),
                po2: Decimal.new("7.2"),
                bicarbonate: Decimal.new("26"),
                base_excess: Decimal.new("1"),
                age: 78,
                sex: "male",
                case_summary:
                  "A 78-year-old male with a history of heart failure presents with acute worsening of dyspnea. He is using accessory muscles and appears cyanotic. Chest examination reveals bilateral crackles and decreased air entry at the bases.",
                primary_disorder: "Respiratory acidosis",
                compensation: "Uncompensated",
                inserted_at: now,
                updated_at: now
              },
              # Additional metabolic alkalosis case
              %{
                scenario: "diuretic_use",
                ph: Decimal.new("7.51"),
                pco2: Decimal.new("6.2"),
                po2: Decimal.new("12.1"),
                bicarbonate: Decimal.new("35"),
                base_excess: Decimal.new("11"),
                age: 68,
                sex: "female",
                case_summary:
                  "A 68-year-old female with heart failure on high-dose diuretics presents for routine follow-up. She reports some weakness and muscle cramps over the past week. Physical examination shows mild dehydration but no acute distress.",
                primary_disorder: "Metabolic alkalosis",
                compensation: "Partially compensated",
                inserted_at: now,
                updated_at: now
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
