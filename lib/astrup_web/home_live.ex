defmodule AstrupWeb.HomeLive do
  use AstrupWeb, :live_view

  def mount(_, _, socket) do
    random_minutes =
      -60..-2
      |> Enum.take_random(1)
      |> List.first()

    date =
      "Europe/Helsinki"
      |> DateTime.now!()
      |> DateTime.add(random_minutes, :minute)

    {:ok,
     socket
     |> assign(:date, date)}
  end

  def render(assigns) do
    ~H"""
    <div class="max-w-xl border mx-auto bg-white p-6 shadow-2xl">
      <!-- Header -->
      <div class="text-center mb-6">
        <h1 class="text-xl font-bold mb-2">RADIOMETER ABL90 SERIES</h1>
        <div class="text-sm space-y-1">
          <div class="flex justify-between">
            <span>ABL90 ABL TeVa I393-092R0178N0019</span>
            <span>{Calendar.strftime(@date, "%H:%M")}</span>
            <span>{Calendar.strftime(@date, "%d.%m.%Y")}</span>
          </div>
          <div class="flex justify-between">
            <span>PATIENT REPORT</span>
            <span>Syringe - S 65uL</span>
            <span>Sample #</span>
            <span>19759</span>
          </div>
        </div>
      </div>
      
    <!-- Identifications Section -->
      <div class="mb-6">
        <h2 class="font-bold text-sm mb-2">Identifications</h2>
        <div class="text-sm space-y-1 ml-4">
          <div class="grid grid-cols-[1fr_2fr] gap-4">
            <span>Patient ID</span>
            <span>XXXXXX-XXXX</span>
          </div>
          <div class="grid grid-cols-[1fr_2fr] gap-4">
            <span>Sample type</span>
            <span>Arterial</span>
          </div>
          <div class="grid grid-cols-[1fr_2fr] gap-4">
            <span>T</span>
            <span>37,0 °C</span>
          </div>
        </div>
      </div>

      <hr class="border-gray-800 mb-4" />
      
    <!-- Temperature-corrected values Section -->
      <div class="mb-6">
        <h2 class="font-bold text-sm mb-2">Temperature-corrected values</h2>
        <div class="text-sm space-y-1 ml-8">
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>pH(T)</span>
            <span class="font-bold text-right">7,446</span>
            <span></span>
          </div>
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>pCO₂(T)</span>
            <span class="font-bold text-right">4,88</span>
            <span>kPa</span>
          </div>
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>pO₂(T)</span>
            <span class="font-bold text-right">11,5</span>
            <span>kPa</span>
          </div>
        </div>
      </div>
      
    <!-- Acid-base status Section -->
      <div class="mb-6">
        <h2 class="font-bold text-sm mb-2">Acid-base status</h2>
        <div class="text-sm space-y-1 ml-8">
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>cHCO₃⁻(P)c</span>
            <span class="font-bold text-right">25,2</span>
            <span>mmol/L</span>
          </div>
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>cBase(Ecf)c</span>
            <span class="font-bold text-right">1,1</span>
            <span>mmol/L</span>
          </div>
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>Anion Gapc</span>
            <span class="font-bold text-right">6,9</span>
            <span>mmol/L</span>
          </div>
        </div>
      </div>
      
    <!-- Oximetry values Section -->
      <div class="mb-6">
        <h2 class="font-bold text-sm mb-2">Oximetry values</h2>
        <div class="text-sm space-y-1 ml-8">
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>ctHb</span>
            <span class="font-bold text-right">107</span>
            <span>g/L</span>
          </div>
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>ctO₂c</span>
            <span class="font-bold text-right">14,5</span>
            <span>Vol%</span>
          </div>
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>sO₂</span>
            <span class="font-bold text-right">96,7</span>
            <span>%</span>
          </div>
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>FCOHb</span>
            <span class="font-bold text-right">0,5</span>
            <span>%</span>
          </div>
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>FMetHb</span>
            <span class="font-bold text-right">0,7</span>
            <span>%</span>
          </div>
        </div>
      </div>
      
    <!-- Electrolyte values Section -->
      <div class="mb-6">
        <h2 class="font-bold text-sm mb-2">Electrolyte values</h2>
        <div class="text-sm space-y-1 ml-8">
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>cK⁺</span>
            <span class="font-bold text-right">3,7</span>
            <span>mmol/L</span>
          </div>
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>cNa⁺</span>
            <span class="font-bold text-right">143</span>
            <span>mmol/L</span>
          </div>
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>cCa²⁺</span>
            <span class="font-bold text-right">1,19</span>
            <span>mmol/L</span>
          </div>
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>cCa²⁺(7.4)c</span>
            <span class="font-bold text-right">1,22</span>
            <span>mmol/L</span>
          </div>
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>cCl⁻</span>
            <span class="font-bold text-right">111</span>
            <span>mmol/L</span>
          </div>
        </div>
      </div>
      
    <!-- Metabolite values Section -->
      <div class="mb-6">
        <h2 class="font-bold text-sm mb-2">Metabolite values</h2>
        <div class="text-sm space-y-1 ml-8">
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>cGlu</span>
            <span class="font-bold text-right">8,7</span>
            <span>mmol/L</span>
          </div>
          <div class="grid grid-cols-[1fr_1fr_1fr] gap-4">
            <span>cLac</span>
            <span class="font-bold text-right">0,7</span>
            <span>mmol/L</span>
          </div>
        </div>
      </div>

      <div class="border-t border-dotted border-gray-400 my-4"></div>
      
    <!-- Notes Section -->
      <div class="mb-6">
        <h2 class="font-bold text-sm mb-2">Notes</h2>
        <div class="text-sm ml-4">
          <div class="flex">
            <span class="mr-4">c</span>
            <span>Calculated value(s)</span>
          </div>
        </div>
      </div>

      <hr class="border-gray-800 mb-4" />
      
    <!-- Footer -->
      <div class="text-xs">
        <div class="flex justify-between">
          <div>
            <div>Solution pack lot: DX-20</div>
            <div>
              Printed&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;0:13:59&nbsp;&nbsp;&nbsp;&nbsp;24.5.2025
            </div>
          </div>
          <div class="text-right">
            <div>Sensor cassette run #: 2496-39</div>
          </div>
        </div>
      </div>
    </div>
    """
  end
end
