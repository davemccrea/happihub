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
        # TODO: how do I convert {:safe, "..."} to string?
        label: raw("pH(<i>T</i>)")
      },
      pco2: %{
        module: Backpex.Fields.Number,
        label: raw("<i>p</i>CO<sub>2</sub>(<i>T</i>)")
      },
      po2: %{
        module: Backpex.Fields.Number,
        label: raw("<i>p</i>O<sub>2</sub>(<i>T</i>)")
      },
      bicarbonate: %{
        module: Backpex.Fields.Number,
        label: raw("<i>c</i>HCO<sub>3</sub><sup>-</sup>(P)<i><sub>c</sub></i>")
      },
      base_excess: %{
        module: Backpex.Fields.Number,
        label: raw("<i>c</i>Base(Ecf)<i><sub>c</sub></i>")
      },
      anion_gap: %{
        module: Backpex.Fields.Number,
        label: raw("Anion Gap<i><sub>c</sub></i>")
      },
      hemoglobin: %{
        module: Backpex.Fields.Number,
        label: raw("<i>c</i>tHb")
      },
      oxygen_content: %{
        module: Backpex.Fields.Number,
        label: raw("<i>c</i>tO<sub>2</sub><i>c</i>")
      },
      oxygen_saturation: %{
        module: Backpex.Fields.Number,
        label: raw("<i>s</i>O<sub>2</sub>")
      },
      carboxyhemoglobin: %{
        module: Backpex.Fields.Number,
        label: raw("<i>F</i>COHb")
      },
      methemoglobin: %{
        module: Backpex.Fields.Number,
        label: raw("<i>F</i>MetHb")
      },
      potassium: %{
        module: Backpex.Fields.Number,
        label: raw("<i>c</i>K<sup>+</sup>")
      },
      sodium: %{
        module: Backpex.Fields.Number,
        label: raw("<i>c</i>Na<sup>+</sup>")
      },
      ionized_calcium: %{
        module: Backpex.Fields.Number,
        label: raw("<i>c</i>Ca<sup>2+</sup>")
      },
      ionized_calcium_corrected_to_ph_7_4: %{
        module: Backpex.Fields.Number,
        label: raw("<i>c</i>Ca<sup>2+</sup>(7.4)<i>c</i>")
      },
      chloride: %{
        module: Backpex.Fields.Number,
        label: raw("<i>c</i>Cl<sup>-</sup>")
      },
      glucose: %{
        module: Backpex.Fields.Number,
        label: raw("<i>c</i>Glu")
      },
      lactate: %{
        module: Backpex.Fields.Number,
        label: raw("<i>c</i>Lac")
      }
    ]
  end
end
