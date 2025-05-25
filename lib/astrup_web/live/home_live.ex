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
     |> assign(:sample_number, sample_number)
     |> assign(:printout, printout)
     |> assign(:show_hints, true)
     |> assign(:sample_date, sample_date)
     |> assign(:printed_date, printed_date)}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash}>
      <article class="relative max-w-2xl mx-auto select-none bg-base-200 py-12 px-12 shadow">
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

        <hr class="border-base-content border-[1.5px] mb-1 mt-1" />

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

        <hr class="border-base-content mb-1 mt-2 border-[1.5px]" />

        <div class="px-4">
          <section class="mb-1">
            <.heading label="Temperature-corrected values" />
            <dl class="space-y-1 ml-8">
              <.parameter parameter_id={0} {assigns}>
                <:label>pH(<i> T </i>)</:label>
              </.parameter>
              <.parameter parameter_id={1} {assigns}>
                <:label>
                  <i>p</i>CO<sub>2</sub>(<i> T </i>)
                </:label>
              </.parameter>
              <.parameter parameter_id={2} {assigns}>
                <:label>
                  <i>p</i>O<sub>2</sub>(<i> T </i>)
                </:label>
              </.parameter>
            </dl>
          </section>

          <section class="mb-1">
            <.heading label="Acid-base status" />
            <dl class="space-y-1 ml-8">
              <.parameter parameter_id={3} {assigns}>
                <:label><i>c</i>HCO<sub>3</sub><sup>-</sup>(P)<i><sub>c</sub></i></:label>
              </.parameter>
              <.parameter parameter_id={4} {assigns}>
                <:label><i>c</i>Base(Ecf)<i><sub>c</sub></i></:label>
              </.parameter>
              <.parameter parameter_id={5} {assigns}>
                <:label>Anion Gap<i><sub>c</sub></i></:label>
              </.parameter>
            </dl>
          </section>

          <section class="mb-1">
            <.heading label="Oximetry values" />
            <dl class="space-y-1 ml-8">
              <.parameter parameter_id={6} {assigns}>
                <:label><i>c</i>tHb</:label>
              </.parameter>
              <.parameter parameter_id={7} {assigns}>
                <:label><i>c</i>tO<sub>2</sub><i>c</i></:label>
              </.parameter>
              <.parameter parameter_id={8} {assigns}>
                <:label><i>s</i>O<sub>2</sub></:label>
              </.parameter>
              <.parameter parameter_id={9} {assigns}>
                <:label><i>F</i>COHb</:label>
              </.parameter>
              <.parameter parameter_id={10} {assigns}>
                <:label><i>F</i>MetHb</:label>
              </.parameter>
            </dl>
          </section>

          <section class="mb-1">
            <.heading label="Electrolyte values" />
            <dl class="space-y-1 ml-8">
              <.parameter parameter_id={11} {assigns}>
                <:label><i>c</i>K<sup>+</sup></:label>
              </.parameter>
              <.parameter parameter_id={12} {assigns}>
                <:label><i>c</i>Na<sup>+</sup></:label>
              </.parameter>
              <.parameter parameter_id={13} {assigns}>
                <:label><i>c</i>Ca<sup>2+</sup></:label>
              </.parameter>
              <.parameter parameter_id={14} {assigns}>
                <:label><i>c</i>Ca<sup>2+</sup>(7.4)<i>c</i></:label>
              </.parameter>
              <.parameter parameter_id={15} {assigns}>
                <:label><i>c</i>Cl<sup>-</sup></:label>
              </.parameter>
            </dl>
          </section>

          <section class="mb-1">
            <.heading label="Metabolite values" />
            <dl class="space-y-1 ml-8">
              <.parameter parameter_id={16} {assigns}>
                <:label><i>c</i>Glu</:label>
              </.parameter>
              <.parameter parameter_id={17} {assigns}>
                <:label><i>c</i>Lac</:label>
              </.parameter>
            </dl>
          </section>
        </div>

        <hr class="border-dashed border-base-content mb-1" />

        <section class="mb-2">
          <.heading label="Notes" />
          <dl>
            <div class="flex flex-row gap-24">
              <dt class="italic">c</dt>
              <dd>Calculated value(s)</dd>
            </div>
          </dl>
        </section>

        <hr class="border-base-content mb-14 border-[1.5px]" />

        <hr class="border-base-content mb-2 border-[1.5px]" />

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
    </Layouts.app>
    """
  end

  def heading(assigns) do
    ~H"""
    <h2 class="text-xl mb-1">{@label}</h2>
    """
  end

  attr :parameter_id, :integer, required: true
  slot :label, required: true

  def parameter(assigns) do
    ~H"""
    <div class="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4">
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
        <dd class="font-bold text-right text-neutral">
          {@printout[@parameter_id]}
        </dd>
      </sl-tooltip>

      <dd>{Astrup.units_for_parameter(:abl90, @parameter_id)}</dd>
    </div>
    """
  end
end
