defmodule Astrup.PatientCase do
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Astrup.{Repo, PatientCase, ClaudeAPI}

  @valid_primary_disorders [
    :normal,
    :respiratory_acidosis,
    :respiratory_alkalosis,
    :metabolic_acidosis,
    :metabolic_alkalosis,
    :not_determined
  ]

  @valid_compensations [:uncompensated, :partially_compensated, :fully_compensated]

  @valid_time_courses [:acute, :chronic, :acute_on_chronic]

  schema "patient_cases" do
    # From Case schema (abg_cases)
    field :summary, :string
    field :description, :string
    field :primary_disorder, Ecto.Enum, values: @valid_primary_disorders
    field :compensation, Ecto.Enum, values: @valid_compensations
    field :time_course, Ecto.Enum, values: @valid_time_courses

    # Shared fields from both schemas
    field :ph, :decimal
    field :pco2, :decimal
    field :po2, :decimal
    field :bicarbonate, :decimal
    field :base_excess, :decimal
    field :age, :integer
    field :sex, :string

    # From Printout schema (additional lab values)
    field :anion_gap, :decimal
    field :hemoglobin, :decimal
    field :oxygen_content, :decimal
    field :oxygen_saturation, :decimal
    field :carboxyhemoglobin, :decimal
    field :methemoglobin, :decimal
    field :potassium, :decimal
    field :sodium, :decimal
    field :ionized_calcium, :decimal
    field :ionized_calcium_corrected_to_ph_7_4, :decimal
    field :chloride, :decimal
    field :glucose, :decimal
    field :lactate, :decimal
    field :checked_at, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  @required_fields [
    :ph,
    :pco2,
    :po2,
    :bicarbonate,
    :base_excess,
    :summary,
    :description,
    :primary_disorder,
    :compensation,
    :anion_gap,
    :hemoglobin,
    :oxygen_content,
    :oxygen_saturation,
    :carboxyhemoglobin,
    :methemoglobin,
    :potassium,
    :sodium,
    :ionized_calcium,
    :ionized_calcium_corrected_to_ph_7_4,
    :chloride,
    :glucose,
    :lactate
  ]

  @optional_fields [
    :checked_at,
    :age,
    :sex,
    :time_course
  ]

  def changeset(patient_case, attrs \\ %{}, _metadata \\ []) do
    patient_case
    |> cast(attrs, @required_fields ++ @optional_fields)
    |> validate_required(@required_fields)
    |> validate_inclusion(:primary_disorder, @valid_primary_disorders)
    |> validate_inclusion(:compensation, @valid_compensations)
    |> validate_inclusion(:time_course, @valid_time_courses)
  end

  def generate_patient_case_with_claude() do
    existing_summaries =
      Astrup.PatientCase.list_cases()
      |> Enum.map(& &1.summary)
      |> Enum.uniq()

    prompt = build_patient_case_prompt(existing_summaries)

    with {:ok, response_text} <- ClaudeAPI.send_prompt(prompt),
         {:ok, case_data} <- parse_json_response(response_text),
         {:ok, patient_case} <- create_case(case_data) do
      {:ok, patient_case}
    else
      {:error, %Ecto.Changeset{} = changeset} ->
        {:error, "Failed to create patient case: #{format_changeset_errors(changeset)}"}

      error ->
        error
    end
  end

  defp parse_json_response(text) do
    case Jason.decode(text) do
      {:ok, json_data} ->
        {:ok, json_data}

      {:error, _} ->
        # Try to extract JSON from text if it's wrapped in other content
        extract_json_from_text(text)
    end
  end

  defp extract_json_from_text(text) do
    case Regex.run(~r/\{.*\}/s, text) do
      [json_string] ->
        case Jason.decode(json_string) do
          {:ok, json_data} -> {:ok, json_data}
          {:error, reason} -> {:error, "Failed to parse extracted JSON: #{inspect(reason)}"}
        end

      nil ->
        {:error, "No JSON object found in response: #{text}"}
    end
  end

  defp format_changeset_errors(changeset) do
    changeset
    |> Ecto.Changeset.traverse_errors(fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
    |> Enum.map(fn {field, errors} -> "#{field}: #{Enum.join(errors, ", ")}" end)
    |> Enum.join("; ")
  end

  defp build_patient_case_prompt(existing_summaries) do
    """
    Generate a realistic clinical blood gas analysis case for medical education with accurate pathophysiology and educational value.

    CRITICAL REQUIREMENTS FOR ACCURACY:

    1. All values must be physiologically consistent and mathematically accurate
    2. Compensation must reflect appropriate time course (acute vs chronic)
    4. Ensure anion gap is consistent with electrolytes
    5. Base excess must correlate with metabolic component of acid-base disorder
    6. For respiratory disorders, ensure HCO3 compensation follows Winter's formula or acute/chronic rules
    7. For metabolic disorders, ensure respiratory compensation is appropriate and not overcompensated

    Return your response as valid JSON with the following exact structure:

    {
      "summary": "string - Concise clinical diagnosis",
      "description": "string - Patient presentation (max 100 words)",
      "primary_disorder": "enum - normal|respiratory_acidosis|respiratory_alkalosis|metabolic_acidosis|metabolic_alkalosis",
      "compensation": "enum - uncompensated|partially_compensated|fully_compensated",
      "time_course": "enum - acute|chronic|acute_on_chronic",
      "ph": "number (unitless)",
      "pco2": "number (kPa)",
      "po2": "number (kPa)",
      "bicarbonate": "number (mmol/L)",
      "base_excess": "number (mmol/L)",
      "age": "number (years)",
      "sex": "string - male|female",
      "anion_gap": "number (mmol/L)",
      "hemoglobin": "number (g/L)",
      "oxygen_content": "number (Vol%)",
      "oxygen_saturation": "number (%)",
      "carboxyhemoglobin": "number (%)",
      "methemoglobin": "number (%)",
      "potassium": "number (mmol/L)",
      "sodium": "number (mmol/L)",
      "ionized_calcium": "number (mmol/L)",
      "ionized_calcium_corrected_to_ph_7_4": "number (mmol/L)",
      "chloride": "number (mmol/L)",
      "glucose": "number (mmol/L)",
      "lactate": "number (mmol/L)"
    }

    CASE VARIETY GUIDELINES:

    - AVOID creating cases similar to these existing summaries: #{Enum.join(existing_summaries, ", ")}
    - Include common conditions (e.g. COPD, DKA, pneumonia) and educational rarities
    - Vary patient demographics realistically
    - Include cases with normal values occasionally for comparison
    - Focus on the ICU and HDU setting

    COMPENSATION RULES TO FOLLOW:

    Respiratory Acidosis:
    - Acute: Expected HCO3 = 24 + (PCO2 - 5.3) x 7.5
    - Chronic: Expected HCO3 = 24 + 4 x (PCO2 - 5.3) x 7.5

    Respiratory Alkalosis:
    - Acute: Expected HCO3 = 24 - 2 x (5.3 - PCO2) x 7.5
    - Chronic: Expected HCO3 = 24 - 5 x (5.3 - PCO2) x 7.5

    Metabolic Acidosis:
    - Expected PCO2 = 1.5 x (HCO3) x 0.133 + 1.1 (±0.3) [Winter's formula converted to kPa]

    Metabolic Alkalosis:
    - Expected PCO2 = 0.7 x (HCO3) x 0.133 + 2.8 (±0.3)

    Only return the JSON object, no additional text.
    """
  end

  @doc """
  Returns a random patient case from the database.
  """
  def get_random_case do
    case_count = Repo.aggregate(PatientCase, :count, :id)

    if case_count > 0 do
      offset = :rand.uniform(case_count) - 1

      PatientCase
      |> limit(1)
      |> offset(^offset)
      |> Repo.one()
    else
      nil
    end
  end

  @doc """
  Returns a random checked patient case (for printout-style cases).
  """
  def get_random_checked_case do
    PatientCase
    |> from(order_by: fragment("RANDOM()"), limit: 1)
    |> where([p], not is_nil(p.checked_at))
    |> Repo.one()
  end

  @doc """
  Mark a patient case as checked.
  """
  def mark_as_checked(patient_case) do
    patient_case
    |> changeset(%{checked_at: DateTime.utc_now()}, [])
    |> Repo.update()
  end

  @doc """
  Returns all patient cases.
  """
  def list_cases do
    Repo.all(PatientCase)
  end

  @doc """
  Gets a single patient case.
  """
  def get_case!(id) do
    Repo.get!(PatientCase, id)
  end

  @doc """
  Creates a patient case.
  """
  def create_case(attrs \\ %{}) do
    %PatientCase{}
    |> changeset(attrs, [])
    |> Repo.insert()
  end

  @doc """
  Updates a patient case.
  """
  def update_case(%PatientCase{} = case, attrs) do
    case
    |> changeset(attrs, [])
    |> Repo.update()
  end

  @doc """
  Deletes a patient case.
  """
  def delete_case(%PatientCase{} = case) do
    Repo.delete(case)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking patient case changes.
  """
  def change_case(%PatientCase{} = case, attrs \\ %{}) do
    changeset(case, attrs, [])
  end
end
