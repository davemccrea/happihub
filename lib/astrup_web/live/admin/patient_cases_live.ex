defmodule AstrupWeb.Admin.PatientCasesLive do
  use Backpex.LiveResource,
    adapter_config: [
      schema: Astrup.PatientCase,
      repo: Astrup.Repo,
      update_changeset: &AstrupWeb.Admin.PatientCasesLive.admin_changeset/3,
      create_changeset: &AstrupWeb.Admin.PatientCasesLive.admin_changeset/3
    ],
    layout: {AstrupWeb.Layouts, :admin}

  def admin_changeset(patient_case, attrs, _metadata) do
    Astrup.PatientCase.changeset(patient_case, attrs, admin: true)
  end

  @impl Backpex.LiveResource
  def singular_name, do: "Patient Case"

  @impl Backpex.LiveResource
  def plural_name, do: "Patient Cases"

  @impl Backpex.LiveResource
  def fields do
    [
      scenario: %{
        module: Backpex.Fields.Text,
        label: "Scenario"
      },
      ph: %{
        module: Backpex.Fields.Number,
        label: "pH"
      },
      pco2: %{
        module: Backpex.Fields.Number,
        label: "pCO2"
      },
      po2: %{
        module: Backpex.Fields.Number,
        label: "pO2"
      },
      bicarbonate: %{
        module: Backpex.Fields.Number,
        label: "Bicarbonate"
      },
      base_excess: %{
        module: Backpex.Fields.Number,
        label: "Base excess"
      },
      age: %{
        module: Backpex.Fields.Number,
        label: "Age"
      },
      sex: %{
        module: Backpex.Fields.Select,
        label: "Sex",
        prompt: "Select option...",
        options: [
          {"Male", "male"},
          {"Female", "female"}
        ]
      },
      anion_gap: %{
        module: Backpex.Fields.Number,
        label: "Anion gap"
      },
      hemoglobin: %{
        module: Backpex.Fields.Number,
        label: "Hemoglobin"
      },
      oxygen_content: %{
        module: Backpex.Fields.Number,
        label: "Oxygen content"
      },
      oxygen_saturation: %{
        module: Backpex.Fields.Number,
        label: "Oxygen saturation"
      },
      carboxyhemoglobin: %{
        module: Backpex.Fields.Number,
        label: "Carboxyhemoglobin"
      },
      methemoglobin: %{
        module: Backpex.Fields.Number,
        label: "Methemoglobin"
      },
      potassium: %{
        module: Backpex.Fields.Number,
        label: "Potassium"
      },
      sodium: %{
        module: Backpex.Fields.Number,
        label: "Sodium"
      },
      ionized_calcium: %{
        module: Backpex.Fields.Number,
        label: "Ionized calcium"
      },
      ionized_calcium_corrected_to_ph_7_4: %{
        module: Backpex.Fields.Number,
        label: "Ionized calcium corrected to pH 7.4"
      },
      chloride: %{
        module: Backpex.Fields.Number,
        label: "Chloride"
      },
      glucose: %{
        module: Backpex.Fields.Number,
        label: "Glucose"
      },
      lactate: %{
        module: Backpex.Fields.Number,
        label: "Lactate"
      },
      case_summary: %{
        module: Backpex.Fields.Textarea,
        label: "Case Summary"
      },
      primary_disorder: %{
        module: Backpex.Fields.Select,
        label: "Primary Disorder",
        prompt: "Select option ...",
        options: [
          {"Normal", :normal},
          {"Respiratory Acidosis", :respiratory_acidosis},
          {"Respiratory Alkalosis", :respiratory_alkalosis},
          {"Metabolic Acidosis", :metabolic_acidosis},
          {"Metabolic Alkalosis", :metabolic_alkalosis},
          {"Not Determined", :not_determined}
        ]
      },
      compensation: %{
        module: Backpex.Fields.Select,
        label: "Compensation",
        prompt: "Select option ...",
        options: [
          {"Uncompensated", :uncompensated},
          {"Partially Compensated", :partially_compensated},
          {"Fully Compensated", :fully_compensated}
        ]
      },
      checked_at: %{
        module: Backpex.Fields.DateTime,
        label: "Checked At"
      }
    ]
  end
end
