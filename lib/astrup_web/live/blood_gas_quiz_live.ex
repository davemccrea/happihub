defmodule AstrupWeb.BloodGasQuizLive do
  @moduledoc """
  Blood gas quiz for testing knowledge of reference values.

  The application can be in one of the following states:
  - `:ready`: Initial state when the page loads.
  - `:answering`: When the user is making selections.
  - `:review`: After the user clicks "Check Answers" and the answers are evaluated.
  """
  use AstrupWeb, :live_view
  alias Astrup.Printout

  @type state :: :ready | :answering | :review

  defp setup(socket) do
    analyzer = Astrup.Analyzer.RadiometerAbl90FlexPlus
    selections = analyzer.blank_parameter_quiz_selections()

    sample_number = Enum.random(10000..99999)

    random_minutes = Enum.random(-60..-2)

    sample_date =
      "Europe/Helsinki"
      |> DateTime.now!()
      |> DateTime.add(random_minutes, :minute)

    printed_date =
      "Europe/Helsinki"
      |> DateTime.now!()
      |> DateTime.add(random_minutes, :minute)
      |> DateTime.add(2, :minute)

    socket
    |> assign(sample_number: sample_number)
    |> assign(sample_date: sample_date)
    |> assign(printed_date: printed_date)
    |> assign(:state, :ready)
    |> assign(:selections, selections)
    |> assign(:number_of_parameters, map_size(selections))
    |> assign(:printout, Printout.get_random_printout())
    |> assign(:lab_module, Astrup.Lab.Fimlab)
    |> assign(:age_range, "31-50")
    |> assign(:sex, "female")
    |> assign(:analyzer, analyzer)
    |> assign(:hints_enabled, false)
  end

  @impl true
  def mount(_, _, socket) do
    {:ok, setup(socket)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale}>
      <div class="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div class="mb-6">
          <h1 class="text-2xl sm:text-3xl font-bold text-center">
            {gettext("Quiz")}
          </h1>
        </div>

        <div class="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
          <div class="lg:sticky lg:top-4 lg:self-start space-y-4 w-full lg:w-72 order-1 lg:order-1">
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
          </div>

          <div class="w-full lg:flex-1 order-2 lg:order-2">
            <AstrupWeb.Components.RadiometerABL90FlexPlus.render
              printout={@printout}
              selections={@selections}
              state={@state}
              hints_enabled={@hints_enabled}
              get_reference_range={
                fn parameter ->
                  Astrup.pretty_print_reference_range(@lab_module, parameter, %{
                    age_range: @age_range,
                    sex: @sex
                  })
                end
              }
              get_unit={fn parameter -> @analyzer.get_unit_by_parameter(parameter) end}
              sample_date={@sample_date}
              printed_date={@printed_date}
              quiz?={true}
            />
          </div>

          <div class="w-full lg:w-72 order-3 lg:order-3">
            <section class="border rounded-none border-base-content/20 shadow-lg p-4">
              <h2 class="text-lg font-semibold mb-3 text-primary">
                {gettext("Settings")}
              </h2>

              <.form for={%{}} class="-space-y-1" phx-change="update_settings">
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
                    {gettext("Note: determines pO2")}
                  </p>
                </fieldset>

                <fieldset class="fieldset">
                  <legend class="fieldset-legend">{gettext("Sex")}</legend>
                  <select name="sex" class="select">
                    <option value="male" selected={@sex == "male"}>{gettext("Male")}</option>
                    <option value="female" selected={@sex == "female"}>{gettext("Female")}</option>
                  </select>
                  <p class="text-sm text-base-content/50">
                    {gettext("Note: determines Hb")}
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
        </div>
      </div>
    </Layouts.app>
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

    {:noreply,
     socket
     |> assign(:lab_module, lab_module)
     |> assign(:age_range, age_range)
     |> assign(:sex, sex)
     |> assign(:hints_enabled, hints_enabled)}
  end

  @impl true
  def handle_event("select", params, socket) do
    parameter = String.to_atom(params["parameter"])
    choice = String.to_atom(params["choice"])
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
        Astrup.check_value_against_reference_range(
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

  defp number_of_selections_made(selections) do
    selections
    |> Enum.filter(fn {_, {selection, _}} -> not is_nil(selection) end)
    |> length()
  end
end
