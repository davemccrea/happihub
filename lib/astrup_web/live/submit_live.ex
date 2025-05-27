defmodule AstrupWeb.SubmitLive do
  use AstrupWeb, :live_view

  alias Astrup.{Repo, Printout}

  def mount(_params, _session, socket) do
    form =
      %Printout{}
      |> Printout.changeset()
      |> to_form()

    {:ok, assign(socket, form: form)}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash}>
      <div class="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 class="text-2xl font-semibold mb-6">Submit ABG</h1>
        <.form for={@form} phx-submit="save" phx-change="validate">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <fieldset class="space-y-4">
              <.legend>Temperature-corrected values</.legend>
              <.parameter_input field={@form[:ph]} label={raw("pH(<i>T</i>)")} />
              <.parameter_input field={@form[:pco2]} label={raw("<i>p</i>CO<sub>2</sub>(<i>T</i>)")} />
              <.parameter_input field={@form[:po2]} label={raw("<i>p</i>O<sub>2</sub>(<i>T</i>)")} />
            </fieldset>

            <fieldset class="space-y-4">
              <.legend>Acid-base status</.legend>
              <.parameter_input
                field={@form[:bicarbonate]}
                label={raw("<i>c</i>HCO<sub>3</sub><sup>-</sup>(P)<i><sub>c</sub></i>")}
              />
              <.parameter_input
                field={@form[:base_excess]}
                label={raw("<i>c</i>Base(Ecf)<i><sub>c</sub></i>")}
              />
              <.parameter_input field={@form[:anion_gap]} label={raw("Anion Gap<i><sub>c</sub></i>")} />
            </fieldset>

            <fieldset class="space-y-4">
              <.legend>Metabolite values</.legend>
              <.parameter_input field={@form[:glucose]} label={raw("<i>c</i>Glu")} />
              <.parameter_input field={@form[:lactate]} label={raw("<i>c</i>Lac")} />
            </fieldset>

            <fieldset class="space-y-4">
              <.legend>Oximetry values</.legend>
              <.parameter_input field={@form[:hemoglobin]} label={raw("<i>c</i>tHb")} />
              <.parameter_input
                field={@form[:oxygen_content]}
                label={raw("<i>c</i>tO<sub>2</sub><i>c</i>")}
              />
              <.parameter_input
                field={@form[:oxygen_saturation]}
                label={raw("<i>s</i>O<sub>2</sub>")}
              />
              <.parameter_input field={@form[:carboxyhemoglobin]} label={raw("<i>F</i>COHb")} />
              <.parameter_input field={@form[:methemoglobin]} label={raw("<i>F</i>MetHb")} />
            </fieldset>

            <fieldset class="space-y-4">
              <.legend>Electrolyte values</.legend>
              <.parameter_input field={@form[:potassium]} label={raw("<i>c</i>K<sup>+</sup>")} />
              <.parameter_input field={@form[:sodium]} label={raw("<i>c</i>Na<sup>+</sup>")} />
              <.parameter_input
                field={@form[:ionized_calcium]}
                label={raw("<i>c</i>Ca<sup>2+</sup>")}
              />
              <.parameter_input
                field={@form[:ionized_calcium_corrected_to_ph_7_4]}
                label={raw("<i>c</i>Ca<sup>2+</sup>(7.4)<i>c</i>")}
              />
              <.parameter_input field={@form[:chloride]} label={raw("<i>c</i>Cl<sup>-</sup>")} />
            </fieldset>

            <fieldset class="space-y-4">
              <.legend>Basic info (optional)</.legend>

              <.input field={@form[:age]} label="Age" type="number" />

              <.input
                type="select"
                label="Sex"
                prompt="Choose..."
                field={@form[:sex]}
                options={[gettext("Male"), gettext("Female")]}
              />
            </fieldset>
          </div>

          <div class="flex flex-col pt-8">
            <button type="submit" class="btn btn-lg btn-primary">Submit ABG</button>
          </div>
        </.form>
      </div>
    </Layouts.app>
    """
  end

  slot :inner_block, required: true

  defp legend(assigns) do
    ~H"""
    <legend class="font-medium mb-4 w-full">
      {render_slot(@inner_block)}
    </legend>
    """
  end

  attr :id, :any, default: nil
  attr :name, :any
  attr :label, :string, default: nil
  attr :value, :any
  attr :errors, :list, default: []

  attr :field, Phoenix.HTML.FormField,
    doc: "a form field struct retrieved from the form, for example: @form[:email]"

  attr :rest, :global

  defp parameter_input(%{field: %Phoenix.HTML.FormField{} = field} = assigns) do
    errors = if Phoenix.Component.used_input?(field), do: field.errors, else: []

    assigns =
      assigns
      |> assign(field: nil, id: field.id)
      |> assign(:errors, Enum.map(errors, &translate_error(&1)))
      |> assign_new(:name, fn -> field.name end)
      |> assign_new(:value, fn -> field.value end)

    ~H"""
    <fieldset class="fieldset mb-2">
      <label class={["input w-full", @errors != [] && "input-error"]}>
        <span class="label">
          <div>{@label}</div>
        </span>
        <input
          type="number"
          name={@name}
          id={@id}
          value={Phoenix.HTML.Form.normalize_value("number", @value)}
          {@rest}
        />
      </label>
    </fieldset>
    """
  end

  def handle_event("validate", %{"printout" => params}, socket) do
    changeset =
      %Printout{}
      |> Printout.changeset(params)
      |> Map.put(:action, :validate)

    {:noreply, assign(socket, form: to_form(changeset))}
  end

  def handle_event("save", %{"printout" => params}, socket) do
    changeset = Printout.changeset(%Printout{}, params)

    case Repo.insert(changeset) do
      {:ok, _} ->
        {:noreply, socket |> put_flash(:info, "ABG submitted successfully")}

      {:error, changeset} ->
        {:noreply,
         socket |> assign(form: to_form(changeset)) |> put_flash(:error, "Failed to submit ABG")}
    end
  end
end
