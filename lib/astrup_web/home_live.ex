defmodule AstrupWeb.HomeLive do
  use AstrupWeb, :live_view

  def mount(_, _, socket) do
    sample_number = Enum.random(10000..99999)

    printout = Astrup.random_printout()

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

    {:ok,
     socket
     |> assign(:show_answers, true)
     |> assign(:sample_number, sample_number)
     |> assign(:printout, printout)
     |> assign(:show_hints, true)
     |> assign(:sample_date, sample_date)
     |> assign(:printed_date, printed_date)}
  end

  def render(assigns) do
    ~H"""
    <div class="relative max-w-2xl mx-auto my-12 select-none">
      <div class="absolute inset-0 bg-white border shadow transform -rotate-[1deg] -z-20" />
      <div class="absolute inset-0 bg-white border shadow transform -rotate-[2deg] -z-10" />
      <article class="relative bg-white border py-12 px-12 shadow">
        <header class="text-center">
          <h1 class="text-3xl font-serif font-medium mb-6">RADIOMETER ABL90 SERIES</h1>
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
              <span>{@sample_number}</span>
            </div>
          </div>
        </header>

        <hr class="border-gray-800 border-[1.5px] mb-1 mt-1" />

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

        <hr class="border-gray-800 mb-1 mt-2 border-[1.5px]" />

        <div class="px-4">
          <section class="mb-1">
            <.heading label="Temperature-corrected values" />
            <dl class="space-y-1 ml-8">
              <.parameter
                value={@printout[0]}
                unit="pH"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={0}
              >
                <:label>pH(<i> T </i>)</:label>
              </.parameter>
              <.parameter
                value={@printout[1]}
                unit="kPa"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={1}
              >
                <:label>
                  <i>p</i>CO<sub>2</sub>(<i> T </i>)
                </:label>
              </.parameter>
              <.parameter
                value={@printout[2]}
                unit="kPa"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={2}
              >
                <:label>
                  <i>p</i>O<sub>2</sub>(<i> T </i>)
                </:label>
              </.parameter>
            </dl>
          </section>

          <section class="mb-1">
            <.heading label="Acid-base status" />
            <dl class="space-y-1 ml-8">
              <.parameter
                value={@printout[3]}
                unit="mmol/L"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={3}
              >
                <:label><i>c</i>HCO<sub>3</sub><sup>-</sup>(P)<i><sub>c</sub></i></:label>
              </.parameter>
              <.parameter
                value={@printout[4]}
                unit="mmol/L"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={4}
              >
                <:label><i>c</i>Base(Ecf)<i><sub>c</sub></i></:label>
              </.parameter>
              <.parameter
                value={@printout[5]}
                unit="mmol/L"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={5}
              >
                <:label>Anion Gap<i><sub>c</sub></i></:label>
              </.parameter>
            </dl>
          </section>

          <section class="mb-1">
            <.heading label="Oximetry values" />
            <dl class="space-y-1 ml-8">
              <.parameter
                value={@printout[6]}
                unit="g/L"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={6}
              >
                <:label><i>c</i>tHb</:label>
              </.parameter>
              <.parameter
                value={@printout[7]}
                unit="Vol%"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={7}
              >
                <:label><i>c</i>tO<sub>2</sub><i>c</i></:label>
              </.parameter>
              <.parameter
                value={@printout[8]}
                unit="%"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={8}
              >
                <:label><i>s</i>O<sub>2</sub></:label>
              </.parameter>
              <.parameter
                value={@printout[9]}
                unit="%"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={9}
              >
                <:label><i>F</i>COHb</:label>
              </.parameter>
              <.parameter
                value={@printout[10]}
                unit="%"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={10}
              >
                <:label><i>F</i>MetHb</:label>
              </.parameter>
            </dl>
          </section>

          <section class="mb-1">
            <.heading label="Electrolyte values" />
            <dl class="space-y-1 ml-8">
              <.parameter
                value={@printout[11]}
                unit="mmol/L"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={11}
              >
                <:label><i>c</i>K<sup>+</sup></:label>
              </.parameter>
              <.parameter
                value={@printout[12]}
                unit="mmol/L"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={12}
              >
                <:label><i>c</i>Na<sup>+</sup></:label>
              </.parameter>
              <.parameter
                value={@printout[13]}
                unit="mmol/L"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={13}
              >
                <:label><i>c</i>Ca<sup>2+</sup></:label>
              </.parameter>
              <.parameter
                value={@printout[14]}
                unit="mmol/L"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={14}
              >
                <:label><i>c</i>Ca<sup>2+</sup>(7.4)<i>c</i></:label>
              </.parameter>
              <.parameter
                value={@printout[15]}
                unit="mmol/L"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={15}
              >
                <:label><i>c</i>Cl<sup>-</sup></:label>
              </.parameter>
            </dl>
          </section>

          <section class="mb-1">
            <.heading label="Metabolite values" />
            <dl class="space-y-1 ml-8">
              <.parameter
                value={@printout[16]}
                unit="mmol/L"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={16}
              >
                <:label><i>c</i>Glu</:label>
              </.parameter>
              <.parameter
                value={@printout[17]}
                unit="mmol/L"
                show_answers={@show_answers}
                show_hints={@show_hints}
                parameter_id={17}
              >
                <:label><i>c</i>Lac</:label>
              </.parameter>
            </dl>
          </section>
        </div>

        <hr class="border-dashed border-gray-400 mb-1" />

        <section class="mb-2">
          <.heading label="Notes" />
          <dl>
            <div class="flex flex-row gap-24">
              <dt class="italic">c</dt>
              <dd>Calculated value(s)</dd>
            </div>
          </dl>
        </section>

        <hr class="border-gray-800 mb-14 border-[1.5px]" />

        <hr class="border-gray-800 mb-2 border-[1.5px]" />

        <footer>
          <div class="flex justify-between">
            <div>
              <div>Solution pack lot: DX-20</div>
              <div class="flex flex-row gap-12">
                <span>Printed</span>
                <time datetime={@printed_date}>{Calendar.strftime(@printed_date, "%H:%M")}</time>
                <time datetime={@printed_date}>{Calendar.strftime(@printed_date, "%d.%m.%Y")}</time>
              </div>
            </div>
            <div class="text-right">
              <div>Sensor cassette run #: 2496-39</div>
            </div>
          </div>
        </footer>
      </article>
    </div>
    """
  end

  def heading(assigns) do
    ~H"""
    <h2 class="text-xl mb-1">{@label}</h2>
    """
  end

  attr :parameter_id, :integer, required: true
  attr :show_hints, :boolean, default: true
  attr :show_answers, :boolean, default: false
  attr :value, :string, required: true
  attr :unit, :string, required: true
  slot :label, required: true

  def parameter(assigns) do
    ~H"""
    <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
      <dt>
        <sl-tooltip
          disabled={!@show_hints}
          placement="top-start"
          content={Astrup.get_parameter_label(@parameter_id)}
        >
          {render_slot(@label)}
        </sl-tooltip>
      </dt>

      <sl-tooltip
        disabled={!@show_hints}
        placement="right"
        content={Astrup.pretty_print_reference_range(@parameter_id)}
      >
        <dd class={[
          "font-bold text-right",
          color_for_value(@parameter_id, @value, @show_answers)
        ]}>
          {@value}
        </dd>
      </sl-tooltip>

      <dd>{@unit}</dd>
    </div>
    """
  end

  defp color_for_value(_id, _value, false), do: ""

  defp color_for_value(id, value, true) do
    case Astrup.check_reference_range(id, value) do
      :high -> "text-red-500"
      :low -> "text-red-500"
      :normal -> ""
    end
  end
end
