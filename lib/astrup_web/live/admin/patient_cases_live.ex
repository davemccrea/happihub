defmodule AstrupWeb.Admin.PatientCasesLive do
  use Backpex.LiveResource,
    adapter_config: [
      schema: Astrup.PatientCase,
      repo: Astrup.Repo,
      update_changeset: &Astrup.PatientCase.changeset/3,
      create_changeset: &Astrup.PatientCase.changeset/3
    ],
    layout: {AstrupWeb.Layouts, :admin}

  @impl Backpex.LiveResource
  def singular_name, do: "Patient Case"

  @impl Backpex.LiveResource
  def plural_name, do: "Patient Cases"

  @impl Backpex.LiveResource
  def fields do
    [
      case_type: %{
        module: Backpex.Fields.Select,
        label: "Case Type",
        options: [
          %{label: "Reference", value: "reference"},
          %{label: "Interpretation", value: "interpretation"},
          %{label: "Mixed", value: "mixed"}
        ]
      },
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
        options: [
          %{label: "Male", value: "male"},
          %{label: "Female", value: "female"}
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
        module: Backpex.Fields.Text,
        label: "Primary Disorder"
      },
      compensation: %{
        module: Backpex.Fields.Text,
        label: "Compensation"
      },
      checked_at: %{
        module: Backpex.Fields.DateTime,
        label: "Checked At"
      }
    ]
  end
end
