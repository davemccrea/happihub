defmodule AstrupWeb.PrintoutsLive do
  use Backpex.LiveResource,
    adapter_config: [
      schema: Astrup.Printout,
      repo: Astrup.Repo,
      update_changeset: &Astrup.Printout.changeset/3,
      create_changeset: &Astrup.Printout.changeset/3
    ],
    layout: {AstrupWeb.Layouts, :admin}

  @impl Backpex.LiveResource
  def singular_name, do: "Printout"

  @impl Backpex.LiveResource
  def plural_name, do: "Printouts"

  @impl Backpex.LiveResource
  def fields do
    [
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
      }
    ]
  end
end
