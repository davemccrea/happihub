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
    seed_test_user()
    seed_patient_cases()
  end

  defp seed_test_user do
    for repo <- repos() do
      {:ok, _, _} =
        Ecto.Migrator.with_repo(repo, fn repo ->
          # Check if test user already exists
          case repo.get_by(Astrup.Accounts.User, email: "test@example.com") do
            nil ->
              # Create test user if it doesn't exist
              {:ok, user} = Astrup.Accounts.register_user(%{email: "test@example.com"})
              
              # Set password for the test user
              {:ok, _user_with_password, _expired_tokens} = 
                Astrup.Accounts.update_user_password(user, %{
                  password: "testpassword123",
                  password_confirmation: "testpassword123"
                })
              
              IO.puts("Test user created: test@example.com")
            
            _existing_user ->
              IO.puts("Test user already exists: test@example.com")
          end
        end)
    end
  end

  defp seed_patient_cases do
    for repo <- repos() do
      {:ok, _, _} =
        Ecto.Migrator.with_repo(repo, fn repo ->
          # Clear existing patient cases
          repo.delete_all(Astrup.PatientCase)

          repo.insert_all(
            Astrup.PatientCase,
            [
              %{
                summary: "Diabetic ketoacidosis with partial respiratory compensation",
                quiz_description:
                  "A 28-year-old female with type 1 diabetes presents to the emergency department with a 2-day history of nausea, vomiting, and abdominal pain. She appears dehydrated and has deep, rapid breathing. Her blood glucose is 24.5 mmol/L and urine ketones are strongly positive.",
                explanation:
                  "This patient has diabetic ketoacidosis (DKA) causing a high anion gap metabolic acidosis due to ketone production. The elevated anion gap of 22 mmol/L is consistent with ketoacidosis. The respiratory system is attempting to compensate by hyperventilating (Kussmaul breathing) to lower PCO2. Using Winter's formula: expected PCO2 = 1.5 × (12) × 0.133 + 1.1 = 3.5 kPa. The actual PCO2 of 3.2 kPa indicates appropriate respiratory compensation. The negative base excess of -14 mmol/L reflects the significant metabolic acidosis. Lactate is mildly elevated due to dehydration and poor perfusion. The low ionized calcium is typical in acidosis due to altered protein binding.",
                primary_disorder: :metabolic_acidosis,
                compensation: :partially_compensated,
                time_course: :acute,
                ph: Decimal.new("7.18"),
                pco2: Decimal.new("3.2"),
                po2: Decimal.new("12.8"),
                bicarbonate: Decimal.new("12"),
                base_excess: Decimal.new("-14"),
                age: 28,
                sex: "female",
                anion_gap: Decimal.new("22"),
                hemoglobin: Decimal.new("145"),
                oxygen_content: Decimal.new("18.2"),
                oxygen_saturation: Decimal.new("96"),
                carboxyhemoglobin: Decimal.new("1.2"),
                methemoglobin: Decimal.new("0.8"),
                potassium: Decimal.new("5.8"),
                sodium: Decimal.new("135"),
                ionized_calcium: Decimal.new("1.08"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.18"),
                chloride: Decimal.new("98"),
                glucose: Decimal.new("24.5"),
                lactate: Decimal.new("3.2"),
                checked_at: nil,
                inserted_at: ~U[2025-07-03 21:05:56Z],
                updated_at: ~U[2025-07-03 21:05:56Z]
              },
              %{
                summary: "Acute salicylate poisoning with mixed acid-base disorder",
                quiz_description:
                  "A 19-year-old female presents to the emergency department with altered mental status, tinnitus, and hyperventilation. Her grandmother reports finding multiple empty aspirin bottles in her room. Initial vital signs show tachypnea (32/min), tachycardia (118 bpm), and hyperthermia (38.9°C). She appears confused and agitated.",
                explanation:
                  "This case demonstrates acute salicylate toxicity causing a mixed acid-base disorder. Salicylates directly stimulate the respiratory center causing respiratory alkalosis initially, while simultaneously uncoupling oxidative phosphorylation leading to metabolic acidosis. The patient shows profound hyperventilation with a very low PCO2, but the pH remains acidic due to the concurrent metabolic acidosis with elevated lactate and anion gap. The base excess is significantly negative, reflecting the metabolic component. This mixed disorder is characteristic of moderate to severe salicylate poisoning.",
                primary_disorder: :metabolic_acidosis,
                compensation: :partially_compensated,
                time_course: :acute,
                ph: Decimal.new("7.28"),
                pco2: Decimal.new("2.8"),
                po2: Decimal.new("13.5"),
                bicarbonate: Decimal.new("13.2"),
                base_excess: Decimal.new("-12.8"),
                age: 19,
                sex: "female",
                anion_gap: Decimal.new("22"),
                hemoglobin: Decimal.new("135"),
                oxygen_content: Decimal.new("18.2"),
                oxygen_saturation: Decimal.new("98"),
                carboxyhemoglobin: Decimal.new("1.2"),
                methemoglobin: Decimal.new("0.8"),
                potassium: Decimal.new("3.1"),
                sodium: Decimal.new("142"),
                ionized_calcium: Decimal.new("1.18"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.32"),
                chloride: Decimal.new("107"),
                glucose: Decimal.new("8.9"),
                lactate: Decimal.new("4.8"),
                checked_at: nil,
                inserted_at: ~U[2025-07-03 21:12:45Z],
                updated_at: ~U[2025-07-03 21:12:45Z]
              },
              %{
                summary:
                  "Acute severe asthma with respiratory acidosis and hypoxemic respiratory failure",
                quiz_description:
                  "A 28-year-old female presents to the emergency department with severe shortness of breath, wheeze, and inability to speak in full sentences. She has a history of asthma and ran out of her inhaler medications 3 days ago. She appears exhausted with accessory muscle use and paradoxical pulse. Heart rate 135 bpm, blood pressure 145/90 mmHg, respiratory rate 32/min, oxygen saturation 88% on room air.",
                explanation:
                  "This patient demonstrates acute severe asthma with impending respiratory failure. The respiratory acidosis (pH 7.28, PCO2 8.1 kPa) indicates CO2 retention due to severe airway obstruction and respiratory muscle fatigue. The elevated PCO2 with acidosis is an ominous sign in asthma, suggesting the patient is tiring and may require mechanical ventilation. There is acute respiratory acidosis with minimal renal compensation (HCO3 26 mmol/L) as expected in the acute setting. The severe hypoxemia (PO2 7.2 kPa) reflects ventilation-perfusion mismatch from widespread bronchoconstriction. The mild elevation in lactate may reflect increased work of breathing and tissue hypoxia.",
                primary_disorder: :respiratory_acidosis,
                compensation: :uncompensated,
                time_course: :acute,
                ph: Decimal.new("7.28"),
                pco2: Decimal.new("8.1"),
                po2: Decimal.new("7.2"),
                bicarbonate: Decimal.new("26"),
                base_excess: Decimal.new("0"),
                age: 28,
                sex: "female",
                anion_gap: Decimal.new("11"),
                hemoglobin: Decimal.new("125"),
                oxygen_content: Decimal.new("14.8"),
                oxygen_saturation: Decimal.new("88"),
                carboxyhemoglobin: Decimal.new("1.2"),
                methemoglobin: Decimal.new("0.8"),
                potassium: Decimal.new("3.2"),
                sodium: Decimal.new("142"),
                ionized_calcium: Decimal.new("1.18"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.28"),
                chloride: Decimal.new("105"),
                glucose: Decimal.new("8.9"),
                lactate: Decimal.new("2.8"),
                checked_at: nil,
                inserted_at: ~U[2025-07-03 21:13:20Z],
                updated_at: ~U[2025-07-03 21:13:20Z]
              },
              %{
                summary:
                  "Acute pulmonary embolism with respiratory alkalosis and hypoxemic respiratory failure",
                quiz_description:
                  "A 34-year-old female presents to the ICU with sudden onset severe dyspnea and chest pain 3 weeks post-cesarean section. She is tachypneic at 28 breaths/min, tachycardic at 115 bpm, and appears anxious. Physical examination reveals clear lung fields but prominent S1Q3T3 pattern on ECG. Arterial blood gas analysis is performed on room air.",
                explanation:
                  "This case demonstrates acute respiratory alkalosis secondary to pulmonary embolism. The patient's hyperventilation in response to hypoxemia and chest pain has caused CO2 elimination, resulting in alkalemia (pH 7.51). The low PCO2 (3.1 kPa) confirms respiratory alkalosis. Acute respiratory alkalosis shows minimal renal compensation - the HCO3 has decreased slightly to 21 mmol/L, which is appropriate for acute compensation. The severe hypoxemia (PO2 7.8 kPa, SaO2 89%) with normal chest examination suggests ventilation-perfusion mismatch typical of PE. The normal anion gap and lactate indicate no significant metabolic acidosis despite tissue hypoxia. The postpartum state increases thrombotic risk significantly.",
                primary_disorder: :respiratory_alkalosis,
                compensation: :partially_compensated,
                time_course: :acute,
                ph: Decimal.new("7.51"),
                pco2: Decimal.new("3.1"),
                po2: Decimal.new("7.8"),
                bicarbonate: Decimal.new("21"),
                base_excess: Decimal.new("-2"),
                age: 34,
                sex: "female",
                anion_gap: Decimal.new("11"),
                hemoglobin: Decimal.new("105"),
                oxygen_content: Decimal.new("12.8"),
                oxygen_saturation: Decimal.new("89"),
                carboxyhemoglobin: Decimal.new("1.2"),
                methemoglobin: Decimal.new("0.8"),
                potassium: Decimal.new("3.8"),
                sodium: Decimal.new("138"),
                ionized_calcium: Decimal.new("1.32"),
                ionized_calcium_corrected_to_ph_7_4: Decimal.new("1.26"),
                chloride: Decimal.new("106"),
                glucose: Decimal.new("6.2"),
                lactate: Decimal.new("1.8"),
                checked_at: nil,
                inserted_at: ~U[2025-07-03 21:13:47Z],
                updated_at: ~U[2025-07-03 21:13:47Z]
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
