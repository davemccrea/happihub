defmodule AstrupWeb.Interpretation.InterpreterLive do
  use AstrupWeb, :live_view

  alias AstrupWeb.Forms.BloodGasForm

  @type state :: :input | :interpreted

  def mount(_, session, socket) do
    current_lab = session["current_lab"] || "Astrup.Lab.Fimlab"
    lab_module = Module.concat([current_lab])
    current_analyzer = session["current_analyzer"] || "Astrup.Analyzer.RadiometerAbl90FlexPlus"
    analyzer = Module.concat([current_analyzer])

    form =
      BloodGasForm.changeset()
      |> to_form()

    {:ok,
     assign(socket,
       state: :input,
       lab_module: lab_module,
       analyzer: analyzer,
       locale: session["locale"] || "en",
       form: form,
       interpretation: nil,
       parameter_status: %{}
     )}
  end

  def render(assigns) do
    ~H"""
    <AstrupWeb.Layouts.app flash={@flash} locale={@locale} current_scope={@current_scope}>
      <div class="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div class="mb-8">
          <h1 class="text-2xl font-semibold mb-4">
            {gettext("Blood Gas Interpreter")}
          </h1>
          <p class="text-base-content/70">
            {gettext("Enter pH, CO₂, and HCO₃⁻ values to get an acid-base interpretation")}
          </p>
        </div>

        <div class="flex flex-col lg:flex-row gap-6">
          <!-- Input Form -->
          <div class="w-full lg:w-80">
            <div class="border border-base-content/20 shadow p-4">
              <h2 class="text-lg font-semibold mb-4 text-primary">{gettext("Blood Gas Values")}</h2>

              <.form for={@form} phx-submit="interpret" phx-change="validate" class="space-y-6">
                <div>
                  <.input
                    field={@form[:ph]}
                    type="number"
                    label="pH"
                    step="0.01"
                    min="6.0"
                    max="8.0"
                    placeholder="7.40"
                  />
                  <p class="text-xs text-base-content/70 mt-1">
                    {gettext("Reference range")}: {Astrup.pretty_print_reference_range(
                      @lab_module,
                      :ph
                    )}
                  </p>
                </div>

                <div>
                  <.input
                    field={@form[:pco2]}
                    type="number"
                    label="pCO₂"
                    step="0.1"
                    min="1.0"
                    max="20.0"
                    placeholder="5.3"
                  />
                  <p class="text-xs text-base-content/70 mt-1">
                    {gettext("Reference range")}: {Astrup.pretty_print_reference_range(
                      @lab_module,
                      :pco2
                    )}
                  </p>
                </div>

                <div>
                  <.input
                    field={@form[:bicarbonate]}
                    type="number"
                    label="HCO₃⁻"
                    step="0.1"
                    min="5.0"
                    max="50.0"
                    placeholder="24.0"
                  />
                  <p class="text-xs text-base-content/70 mt-1">
                    {gettext("Reference range")}: {Astrup.pretty_print_reference_range(
                      @lab_module,
                      :bicarbonate
                    )}
                  </p>
                </div>

                <button type="submit" class="btn btn-primary w-full" disabled={!@form.source.valid?}>
                  {gettext("Interpret")}
                </button>
              </.form>

              <%= if @state == :input do %>
                <button type="button" phx-click="clear_form" class="btn btn-ghost w-full mt-2">
                  {gettext("Clear")}
                </button>
              <% else %>
                <button type="button" phx-click="reset" class="btn btn-ghost w-full mt-2">
                  {gettext("New Interpretation")}
                </button>
              <% end %>
            </div>
          </div>
          
    <!-- Results -->
          <div class="w-full lg:flex-1">
            <%= if @state == :interpreted && @interpretation do %>
              <div class="border border-base-content/20 shadow p-4">
                <h3 class="text-lg font-semibold mb-6 text-primary">{gettext("Interpretation")}</h3>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div class="card bg-base-200 shadow-sm">
                    <div class="card-body">
                      <h3 class="card-title text-sm">pH</h3>
                      <div class="stat-value text-lg font-mono text-primary">
                        {@form.params["ph"]}
                      </div>
                      <div class="card-actions justify-start mt-4">
                        <div class={["badge", status_badge_class(:ph, @parameter_status[:ph])]}>
                          {ph_status_text(@parameter_status[:ph])}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="card bg-base-200 shadow-sm">
                    <div class="card-body">
                      <h3 class="card-title text-sm">pCO₂</h3>
                      <div class="stat-value text-lg font-mono text-primary">
                        {@form.params["pco2"]} kPa
                      </div>
                      <div class="card-actions justify-start mt-4">
                        <div class={["badge", status_badge_class(:pco2, @parameter_status[:pco2])]}>
                          {pco2_status_text(@parameter_status[:pco2])}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="card bg-base-200 shadow-sm">
                    <div class="card-body">
                      <h3 class="card-title text-sm">HCO₃⁻</h3>
                      <div class="stat-value text-lg font-mono text-primary">
                        {@form.params["bicarbonate"]} mmol/L
                      </div>
                      <div class="card-actions justify-start mt-4">
                        <div class={["badge", status_badge_class(:bicarbonate, @parameter_status[:bicarbonate])]}>
                          {bicarbonate_status_text(@parameter_status[:bicarbonate])}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="space-y-4">
                  <%= case @interpretation do %>
                    <% {disorder, compensation} when disorder != :normal -> %>
                      <div class="bg-base-100 border-2 border-primary/20 rounded-lg p-6">
                        <div class="text-center space-y-4">
                          <h3 class="text-2xl font-bold text-primary">{disorder_text(disorder)}</h3>
                          <%= if compensation != :not_determined do %>
                            <div class="text-lg text-base-content/80 font-medium">
                              {compensation_text(compensation)}
                            </div>
                          <% end %>
                        </div>
                      </div>
                    <% :normal -> %>
                      <div class="alert alert-success">
                        <div class="flex-1">
                          <p class="text-lg">{gettext("Normal acid-base status")}</p>
                        </div>
                      </div>
                    <% :not_determined -> %>
                      <div class="alert alert-warning">
                        <div class="flex-1">
                          <p class="text-lg">{gettext("Cannot determine primary disorder")}</p>
                          <p class="text-sm mt-2 opacity-80">
                            {gettext(
                              "The combination of values suggests a mixed disorder or measurement error"
                            )}
                          </p>
                        </div>
                      </div>
                  <% end %>
                </div>
              </div>
            <% else %>
              <div class="border border-base-content/20 shadow p-8 text-center text-base-content/60">
                <p>
                  {gettext("Fill in the blood gas values to get an interpretation")}
                </p>
              </div>
            <% end %>
          </div>
        </div>
      </div>
    </AstrupWeb.Layouts.app>
    """
  end

  def handle_event("validate", %{"blood_gas_form" => params}, socket) do
    changeset = BloodGasForm.changeset(params)
    form = to_form(changeset, action: :validate)

    {:noreply, assign(socket, form: form)}
  end

  def handle_event("interpret", %{"blood_gas_form" => params}, socket) do
    changeset = BloodGasForm.changeset(params)

    if changeset.valid? do
      # Get validated data
      %{ph: ph, pco2: pco2, bicarbonate: bicarbonate} = Ecto.Changeset.apply_changes(changeset)

      # Get parameter status
      parameter_status = %{
        ph: Astrup.check_value_against_reference_range(socket.assigns.lab_module, :ph, ph),
        pco2: Astrup.check_value_against_reference_range(socket.assigns.lab_module, :pco2, pco2),
        bicarbonate:
          Astrup.check_value_against_reference_range(
            socket.assigns.lab_module,
            :bicarbonate,
            bicarbonate
          )
      }

      # Get interpretation
      interpretation = Astrup.Interpreter.primary_disorder(parameter_status)

      form = to_form(changeset)

      {:noreply,
       assign(socket,
         state: :interpreted,
         parameter_status: parameter_status,
         interpretation: interpretation,
         form: form
       )}
    else
      form = to_form(changeset, action: :validate)
      {:noreply, assign(socket, form: form)}
    end
  end

  def handle_event("clear_form", _params, socket) do
    form =
      BloodGasForm.changeset()
      |> to_form()

    {:noreply, assign(socket, form: form)}
  end

  def handle_event("reset", _params, socket) do
    form =
      BloodGasForm.changeset()
      |> to_form()

    {:noreply,
     assign(socket,
       state: :input,
       form: form,
       interpretation: nil,
       parameter_status: %{}
     )}
  end

  # Helper functions

  defp status_badge_class(parameter, status)
  defp status_badge_class(_parameter, :normal), do: "badge-success"
  defp status_badge_class(:ph, :high), do: "badge-info"  # pH high = Alkalosis = blue
  defp status_badge_class(:ph, :low), do: "badge-error"  # pH low = Acidosis = red
  defp status_badge_class(:pco2, :high), do: "badge-error"  # pCO₂ high = Acidosis = red
  defp status_badge_class(:pco2, :low), do: "badge-info"  # pCO₂ low = Alkalosis = blue
  defp status_badge_class(:bicarbonate, :high), do: "badge-info"  # HCO₃⁻ high = Alkalosis = blue
  defp status_badge_class(:bicarbonate, :low), do: "badge-error"  # HCO₃⁻ low = Acidosis = red

  # pH: Low = Acidosis, High = Alkalosis
  defp ph_status_text(:normal), do: gettext("Normal")
  defp ph_status_text(:high), do: gettext("Alkalosis")
  defp ph_status_text(:low), do: gettext("Acidosis")

  # pCO₂: Low = Alkalosis, High = Acidosis (respiratory)
  defp pco2_status_text(:normal), do: gettext("Normal")
  defp pco2_status_text(:high), do: gettext("Acidosis")
  defp pco2_status_text(:low), do: gettext("Alkalosis")

  # HCO₃⁻: Low = Acidosis, High = Alkalosis (metabolic)
  defp bicarbonate_status_text(:normal), do: gettext("Normal")
  defp bicarbonate_status_text(:high), do: gettext("Alkalosis")
  defp bicarbonate_status_text(:low), do: gettext("Acidosis")

  defp disorder_text(:respiratory_acidosis), do: gettext("Respiratory Acidosis")
  defp disorder_text(:respiratory_alkalosis), do: gettext("Respiratory Alkalosis")
  defp disorder_text(:metabolic_acidosis), do: gettext("Metabolic Acidosis")
  defp disorder_text(:metabolic_alkalosis), do: gettext("Metabolic Alkalosis")

  defp compensation_text(:uncompensated), do: gettext("Uncompensated")
  defp compensation_text(:partially_compensated), do: gettext("Partially compensated")
  defp compensation_text(:fully_compensated), do: gettext("Fully compensated")
end
