defmodule AstrupWeb.AbgReferenceValuesLive do
  @moduledoc """
  The application can be in one of the following states:
  - `:ready`: Initial state when the page loads.
  - `:answering`: When the user is making selections.
  - `:review`: After the user clicks "Check Answers" and the answers are evaluated.
  """
  use AstrupWeb, :live_view
  alias Astrup.{Parameter, Printout}

  @type mode :: :learn | :quiz
  @type state :: :ready | :answering | :review

  defp setup(socket) do
    sample_number = Enum.random(10000..99999)
    random_minutes = Enum.random(-60..-2)
    printout = Printout.get_random_printout()
    lab_module = Astrup.Lab.Fimlab
    analyzer = Astrup.Analyzer.RadiometerAbl90FlexPlus
    age_range = "31-50"
    sex = "male"

    sample_date =
      "Europe/Helsinki"
      |> DateTime.now!()
      |> DateTime.add(random_minutes, :minute)

    printed_date =
      "Europe/Helsinki"
      |> DateTime.now!()
      |> DateTime.add(random_minutes, :minute)
      |> DateTime.add(2, :minute)

    selections = analyzer.blank_parameter_quiz_selections()

    socket
    |> assign(:selections, selections)
    |> assign(:number_of_parameters, map_size(selections))
    |> assign(:state, :ready)
    |> assign(:printout, printout)
    |> assign(:sample_number, sample_number)
    |> assign(:sample_date, sample_date)
    |> assign(:printed_date, printed_date)
    |> assign(:lab_module, lab_module)
    |> assign(:age_range, age_range)
    |> assign(:sex, sex)
    |> assign(:analyzer, analyzer)
    |> assign(:mode, :quiz)
    |> assign(:hints_enabled, false)
  end

  @impl true
  def mount(_, _, socket) do
    {:ok, setup(socket)}
  end

  @impl true
  def handle_params(params, _uri, socket) do
    mode =
      params
      |> Map.get("mode", "learn")
      |> String.to_existing_atom()

    {:noreply, assign(socket, :mode, mode)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale}>
      <div class="container mx-auto px-4 py-8 flex flex-col gap-8">
        <h1 class="text-2xl font-semibold mb-3 text-center">
          <%= if @mode == :quiz do %>
            {gettext("Reference Values — Quiz")}
          <% else %>
            {gettext("Reference Values — Learn")}
          <% end %>
        </h1>

        <div class="flex flex-row gap-8 justify-center">
          <div class="sticky top-4 self-start space-y-4 w-64">
            <section class="space-y-4 border border-base-content/20 shadow-lg p-4">
              <h1 class="text-lg font-semibold mb-3 text-primary">{gettext("Instructions")}</h1>
              <p class="mb-4">
                {gettext(
                  "For each parameter, select whether the value is Low (L), Normal (N), or High (H) compared to its reference range. Once you\'ve made all 18 selections, click \"Check Answers\"."
                )}
              </p>

              <div class="flex flex-col gap-3">
                <button
                  id="check-answers"
                  phx-click="check_answers"
                  class="btn btn-primary w-full"
                  disabled={
                    @state == :review or
                      number_of_selections_made(@selections) != @number_of_parameters
                  }
                >
                  {gettext("Check Answers")}
                </button>
                <button phx-click="next" class="btn btn-secondary w-full" disabled={@state != :review}>
                  {gettext("Next")} <.icon name="hero-arrow-right" />
                </button>
              </div>
            </section>

            <section class="space-y-4 border border-base-content/20 shadow-lg p-4">
              <h2 class="text-lg font-semibold mb-3 text-primary">
                {gettext("Progress")}
              </h2>
              <ul>
                <li>{gettext("Answers: ")} {number_of_selections_made(@selections)}/18</li>
                <%= if @state == :review do %>
                  <li>{gettext("Score:")} {correct_count(@selections)}/{total_count(@selections)}</li>
                  <li
                    :if={full_score?(@selections)}
                    id="congratulations"
                    class="text-lg font-semibold text-success"
                  >
                    {gettext("Nice one!")} 🎉
                  </li>
                <% end %>
              </ul>
            </section>

            <section class="border rounded-none border-base-content/20 shadow-lg p-4">
              <h2 class="text-lg font-semibold mb-3 text-primary">
                {gettext("Settings")}
              </h2>

              <.form for={%{}} phx-change="update_settings">
                <fieldset class="fieldset">
                  <legend class="fieldset-legend">{gettext("Laboratory")}</legend>
                  <select name="lab_module" class="select">
                    <option value="Astrup.Lab.Fimlab" selected={@lab_module == Astrup.Lab.Fimlab}>
                      {gettext("Fimlab VCS")}
                    </option>
                  </select>
                </fieldset>

                <fieldset class="fieldset">
                  <legend class="fieldset-legend">{gettext("Analyzer")}</legend>
                  <select name="analyzer" class="select">
                    <option
                      value="Astrup.Analyzer.RadiometerAbl90FlexPlus"
                      selected={@analyzer == Astrup.Analyzer.RadiometerAbl90FlexPlus}
                    >
                      {gettext("Radiometer ABL90 Flex Plus")}
                    </option>
                  </select>
                </fieldset>

                <fieldset class="fieldset">
                  <legend class="fieldset-legend">{gettext("Age Range")}</legend>
                  <select name="age_range" class="select">
                    <option value="0-18" selected={@age_range == "0-18"}>0-18</option>
                    <option value="18-30" selected={@age_range == "18-30"}>18-30</option>
                    <option value="31-50" selected={@age_range == "31-50"}>31-50</option>
                    <option value="51-60" selected={@age_range == "51-60"}>51-60</option>
                    <option value="61-70" selected={@age_range == "61-70"}>61-70</option>
                    <option value="71-80" selected={@age_range == "71-80"}>71-80</option>
                    <option value=">80" selected={@age_range == ">80"}>&gt;80</option>
                  </select>
                  <p class="text-sm text-base-content/50">
                    {gettext("Note: affects pO2")}
                  </p>
                </fieldset>

                <fieldset class="fieldset">
                  <legend class="fieldset-legend">{gettext("Sex")}</legend>
                  <select name="sex" class="select">
                    <option value="male" selected={@sex == "male"}>{gettext("Male")}</option>
                    <option value="female" selected={@sex == "female"}>{gettext("Female")}</option>
                  </select>
                  <p class="text-sm text-base-content/50">
                    {gettext("Note: affects Hb")}
                  </p>
                </fieldset>

                <fieldset class="fieldset mt-4">
                  <% checked = Phoenix.HTML.Form.normalize_value("checkbox", @hints_enabled) %>

                  <label>
                    <input type="hidden" name="hints_enabled" value="false" />
                    <span class="label">
                      <input
                        type="checkbox"
                        name="hints_enabled"
                        value="true"
                        checked={checked}
                        class="checkbox checkbox-sm"
                      />
                      {gettext("Show hover hints")}
                    </span>
                  </label>
                </fieldset>
              </.form>
            </section>
          </div>

          <article class="relative max-w-2xl flex-1 select-none py-12 px-12 shadow-lg border border-base-content/20">
            <header class="text-center">
              <h2 class="text-3xl font-serif font-medium mb-6">RADIOMETER ABL90 SERIES</h2>
              <div class="space-y-1">
                <div class="flex justify-between">
                  <span>ABL90 ABL TeVa I393-092R0178N0019</span>
                  <time>{Calendar.strftime(@sample_date, "%H:%M")}</time>
                  <time>{Calendar.strftime(@sample_date, "%d.%m.%Y")}</time>
                </div>
                <div class="flex justify-between">
                  <span>PATIENT REPORT</span>
                  <span>Syringe - S 65uL</span>
                  <span>Sample #</span>
                  <span>{@printout.id}</span>
                </div>
              </div>
            </header>

            <hr class="border-[1.5px] mb-1 mt-1" />

            <section class="px-2">
              <.heading label="Identifications" />
              <dl class="ml-4">
                <div class="grid grid-cols-[1fr_2fr] gap-4">
                  <dt>Patient ID</dt>
                  <dd>XXXXXX-XXXX</dd>
                </div>
                <div class="grid grid-cols-[1fr_2fr] gap-4">
                  <dt>Sample type</dt>
                  <dd>Arterial</dd>
                </div>
                <div class="grid grid-cols-[1fr_2fr] gap-4">
                  <dt class="italic">T</dt>
                  <dd>37,0 °C</dd>
                </div>
              </dl>
            </section>

            <hr class="mb-1 mt-2 border-[1.5px]" />

            <div class="px-4">
              <section class="mb-1">
                <.heading label="Temperature-corrected values" />
                <dl class="space-y-1 ml-8">
                  <.parameter parameter={:ph} {assigns}>
                    <:label>pH(<i> T </i>)</:label>
                  </.parameter>
                  <.parameter parameter={:pco2} {assigns}>
                    <:label>
                      <i>p</i>CO<sub>2</sub>(<i> T </i>)
                    </:label>
                  </.parameter>
                  <.parameter parameter={:po2} {assigns}>
                    <:label>
                      <i>p</i>O<sub>2</sub>(<i> T </i>)
                    </:label>
                  </.parameter>
                </dl>
              </section>

              <section class="mb-1">
                <.heading label="Acid-base status" />
                <dl class="space-y-1 ml-8">
                  <.parameter parameter={:bicarbonate} {assigns}>
                    <:label><i>c</i>HCO<sub>3</sub><sup>-</sup>(P)<i><sub>c</sub></i></:label>
                  </.parameter>
                  <.parameter parameter={:base_excess} {assigns}>
                    <:label><i>c</i>Base(Ecf)<i><sub>c</sub></i></:label>
                  </.parameter>
                  <.parameter parameter={:anion_gap} {assigns}>
                    <:label>Anion Gap<i><sub>c</sub></i></:label>
                  </.parameter>
                </dl>
              </section>

              <section class="mb-1">
                <.heading label="Oximetry values" />
                <dl class="space-y-1 ml-8">
                  <.parameter parameter={:hemoglobin} {assigns}>
                    <:label><i>c</i>tHb</:label>
                  </.parameter>
                  <.parameter parameter={:oxygen_content} {assigns}>
                    <:label><i>c</i>tO<sub>2</sub><i>c</i></:label>
                  </.parameter>
                  <.parameter parameter={:oxygen_saturation} {assigns}>
                    <:label><i>s</i>O<sub>2</sub></:label>
                  </.parameter>
                  <.parameter parameter={:carboxyhemoglobin} {assigns}>
                    <:label><i>F</i>COHb</:label>
                  </.parameter>
                  <.parameter parameter={:methemoglobin} {assigns}>
                    <:label><i>F</i>MetHb</:label>
                  </.parameter>
                </dl>
              </section>

              <section class="mb-1">
                <.heading label="Electrolyte values" />
                <dl class="space-y-1 ml-8">
                  <.parameter parameter={:potassium} {assigns}>
                    <:label><i>c</i>K<sup>+</sup></:label>
                  </.parameter>
                  <.parameter parameter={:sodium} {assigns}>
                    <:label><i>c</i>Na<sup>+</sup></:label>
                  </.parameter>
                  <.parameter parameter={:ionized_calcium} {assigns}>
                    <:label><i>c</i>Ca<sup>2+</sup></:label>
                  </.parameter>
                  <.parameter parameter={:ionized_calcium_corrected_to_ph_7_4} {assigns}>
                    <:label><i>c</i>Ca<sup>2+</sup>(7.4)<i>c</i></:label>
                  </.parameter>
                  <.parameter parameter={:chloride} {assigns}>
                    <:label><i>c</i>Cl<sup>-</sup></:label>
                  </.parameter>
                </dl>
              </section>

              <section class="mb-1">
                <.heading label="Metabolite values" />
                <dl class="space-y-1 ml-8">
                  <.parameter parameter={:glucose} {assigns}>
                    <:label><i>c</i>Glu</:label>
                  </.parameter>
                  <.parameter parameter={:lactate} {assigns}>
                    <:label><i>c</i>Lac</:label>
                  </.parameter>
                </dl>
              </section>
            </div>

            <hr class="border-dashed mb-1" />

            <section class="mb-2">
              <.heading label="Notes" />
              <dl>
                <div class="flex flex-row gap-24">
                  <dt class="italic">c</dt>
                  <dd>Calculated value(s)</dd>
                </div>
              </dl>
            </section>

            <hr class="mb-14 border-[1.5px]" />

            <hr class="mb-2 border-[1.5px]" />

            <footer>
              <div class="flex justify-between">
                <div>
                  <div>Solution pack lot: DX-20</div>
                  <div class="flex flex-row gap-12">
                    <span>Printed</span>
                    <time datetime={@printed_date}>{Calendar.strftime(@printed_date, "%H:%M")}</time>
                    <time datetime={@printed_date}>
                      {Calendar.strftime(@printed_date, "%d.%m.%Y")}
                    </time>
                  </div>
                </div>
                <div class="text-right">
                  <div>Sensor cassette run #: 2496-39</div>
                </div>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </Layouts.app>
    """
  end

  def heading(assigns) do
    ~H"""
    <h3 class="text-xl mb-1">{@label}</h3>
    """
  end

  attr :parameter, :atom, required: true
  slot :label, required: true

  def parameter(assigns) do
    ~H"""
    <% {selection, correct_answer?} = @selections[@parameter] %>

    <div id={"param-#{@parameter}"} class="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4">
      <%= if @hints_enabled do %>
        <dt class="cursor-pointer">
          <div class="tooltip tooltip-right" data-tip={Parameter.get_label(@parameter)}>
            {render_slot(@label)}
          </div>
        </dt>
      <% else %>
        <dt>{render_slot(@label)}</dt>
      <% end %>

      <%= if @hints_enabled do %>
        <dd class="cursor-pointer font-bold text-right">
          <div
            class="tooltip tooltip-left"
            data-tip={
              Astrup.Lab.pretty_print_reference_range(@lab_module, @parameter, %{
                age_range: @age_range,
                sex: @sex
              })
            }
          >
            {Map.get(@printout, @parameter)}
          </div>
        </dd>
      <% else %>
        <dd class="font-bold text-right">
          {Map.get(@printout, @parameter)}
        </dd>
      <% end %>

      <dd>{@analyzer.get_unit_by_parameter(@parameter)}</dd>

      <dd class="flex flex-row gap-1 items-center">
        <div
          id={"tooltip-param-#{@parameter}"}
          class={
            if(@state == :review && not correct_answer?,
              do: "tooltip tooltip-right tooltip-open",
              else: ""
            )
          }
          data-tip={
            Astrup.Lab.pretty_print_reference_range(@lab_module, @parameter, %{
              age_range: @age_range,
              sex: @sex
            })
          }
        >
          <button
            id={"btn-param-#{@parameter}-low"}
            phx-click="select"
            phx-value-choice="low"
            phx-value-parameter={@parameter}
            class={[
              "btn btn-sm btn-square",
              button_colour(selection == :low, correct_answer?, @state)
            ]}
          >
            {gettext("L")}
          </button>

          <button
            id={"btn-param-#{@parameter}-normal"}
            phx-click="select"
            phx-value-choice="normal"
            phx-value-parameter={@parameter}
            class={[
              "btn btn-sm btn-square",
              button_colour(selection == :normal, correct_answer?, @state)
            ]}
          >
            {gettext("N")}
          </button>

          <button
            id={"btn-param-#{@parameter}-high"}
            phx-click="select"
            phx-value-choice="high"
            phx-value-parameter={@parameter}
            class={[
              "btn btn-sm btn-square",
              button_colour(selection == :high, correct_answer?, @state)
            ]}
          >
            {gettext("H")}
          </button>
        </div>
      </dd>
    </div>
    """
  end

  @impl true
  def handle_event("update_settings", params, socket) do
    %{
      "lab_module" => lab_module,
      "age_range" => age_range,
      "sex" => sex,
      "hints_enabled" => hints_enabled
    } = params

    hints_enabled =
      case hints_enabled do
        "true" -> true
        "false" -> false
        _ -> false
      end

    lab_module = Module.concat([String.to_atom(lab_module)])

    socket =
      socket
      |> assign(:lab_module, lab_module)
      |> assign(:age_range, age_range)
      |> assign(:sex, sex)
      |> assign(:hints_enabled, hints_enabled)
      |> assign(
        :selections,
        Astrup.Analyzer.RadiometerAbl90FlexPlus.blank_parameter_quiz_selections()
      )
      |> assign(:state, :ready)

    {:noreply, socket}
  end

  @impl true
  def handle_event("select", params, socket) do
    parameter = String.to_existing_atom(params["parameter"])
    choice = String.to_existing_atom(params["choice"])
    selections = Map.put(socket.assigns.selections, parameter, {choice, nil})

    {:noreply,
     socket
     |> assign(:selections, selections)
     |> assign(:state, :answering)}
  end

  @impl true
  def handle_event("check_answers", _params, %{assigns: _assigns} = socket) do
    checked_answers = check_answers(socket.assigns)

    socket =
      if full_score?(checked_answers) do
        push_event(socket, "confetti", %{})
      else
        socket
      end

    {:noreply,
     socket
     |> assign(:selections, checked_answers)
     |> assign(:state, :review)}
  end

  @impl true
  def handle_event("next", _params, socket) do
    {:noreply, setup(socket)}
  end

  def handle_event("toggle_mode", %{"mode" => mode_string}, socket) do
    mode = String.to_atom(mode_string)
    {:noreply, assign(socket, :mode, mode)}
  end

  defp check_answers(%{
         selections: selections,
         printout: printout,
         lab_module: lab_module,
         age_range: age_range,
         sex: sex
       }) do
    Enum.reduce(selections, %{}, fn {parameter, {choice, _}}, acc ->
      parameter_value = Map.get(printout, parameter)
      context = %{age_range: age_range, sex: sex}

      correct_answer =
        Astrup.Lab.check_value_against_reference_range(
          lab_module,
          parameter,
          parameter_value,
          context
        )

      Map.put(acc, parameter, {choice, choice == correct_answer})
    end)
  end

  defp correct_count(selections) do
    selections
    |> Enum.filter(fn {_, {_, correct?}} -> correct? == true end)
    |> length()
  end

  defp total_count(selections), do: map_size(selections)

  defp full_score?(selections) do
    correct_count = correct_count(selections)
    total_count = total_count(selections)
    correct_count == total_count && total_count > 0
  end

  # selected?, correct_answer?, state
  defp button_colour(true, true, :review), do: "border border-success border-2"
  defp button_colour(true, false, :review), do: "border border-error border-2"
  defp button_colour(true, _, :answering), do: "border border-base-content border-2"
  defp button_colour(_, _, _), do: "border border-transparent border-2"

  defp number_of_selections_made(selections) do
    selections
    |> Enum.filter(fn {_, {selection, _}} -> not is_nil(selection) end)
    |> length()
  end
end
