defmodule AstrupWeb.HomeLive do
  use AstrupWeb, :live_view

  def mount(_, _, socket) do
    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <div class="max-w-xl border mx-auto bg-white p-6 shadow-2xl">
      <div class="max-w-md mx-auto bg-white p-6 shadow-lg">
        <!-- Header -->
        <div class="text-center mb-6">
          <h1 class="text-xl font-bold mb-2">RADIOMETER ABL90 SERIES</h1>
          <div class="text-sm space-y-1">
            <div class="flex justify-between">
              <span>ABL90 ABL TeVa I393-092R0178N0019</span>
              <span>22:39</span>
              <span>23.5.2025</span>
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
            <div class="grid grid-cols-2">
              <span>Patient ID</span>
              <span class="text-right">110875-205H</span>
            </div>
            <div class="grid grid-cols-2">
              <span>Sample type</span>
              <span class="text-right">Arterial</span>
            </div>
            <div class="grid grid-cols-2">
              <span>T</span>
              <span class="text-right">37,0 °C</span>
            </div>
          </div>
        </div>

        <hr class="border-gray-800 mb-4" />
        
    <!-- Temperature-corrected values Section -->
        <div class="mb-6">
          <h2 class="font-bold text-sm mb-2">Temperature-corrected values</h2>
          <div class="text-sm space-y-1 ml-8">
            <div class="flex">
              <span class="flex-1">pH(T)</span>
              <span class="font-bold text-right w-16">7,446</span>
            </div>
            <div class="flex">
              <span class="flex-1">pCO₂(T)</span>
              <span class="font-bold text-right w-16">4,88</span>
              <span class="ml-2">kPa</span>
            </div>
            <div class="flex">
              <span class="flex-1">pO₂(T)</span>
              <span class="font-bold text-right w-16">11,5</span>
              <span class="ml-2">kPa</span>
            </div>
          </div>
        </div>
        
    <!-- Acid-base status Section -->
        <div class="mb-6">
          <h2 class="font-bold text-sm mb-2">Acid-base status</h2>
          <div class="text-sm space-y-1 ml-8">
            <div class="flex">
              <span class="flex-1">cHCO₃⁻(P)c</span>
              <span class="font-bold text-right w-16">25,2</span>
              <span class="ml-2">mmol/L</span>
            </div>
            <div class="flex">
              <span class="flex-1">cBase(Ecf)c</span>
              <span class="font-bold text-right w-16">1,1</span>
              <span class="ml-2">mmol/L</span>
            </div>
            <div class="flex">
              <span class="flex-1">Anion Gapc</span>
              <span class="font-bold text-right w-16">6,9</span>
              <span class="ml-2">mmol/L</span>
            </div>
          </div>
        </div>
        
    <!-- Oximetry values Section -->
        <div class="mb-6">
          <h2 class="font-bold text-sm mb-2">Oximetry values</h2>
          <div class="text-sm space-y-1 ml-8">
            <div class="flex">
              <span class="flex-1">ctHb</span>
              <span class="font-bold text-right w-16">107</span>
              <span class="ml-2">g/L</span>
            </div>
            <div class="flex">
              <span class="flex-1">ctO₂c</span>
              <span class="font-bold text-right w-16">14,5</span>
              <span class="ml-2">Vol%</span>
            </div>
            <div class="flex">
              <span class="flex-1">sO₂</span>
              <span class="font-bold text-right w-16">96,7</span>
              <span class="ml-2">%</span>
            </div>
            <div class="flex">
              <span class="flex-1">FCOHb</span>
              <span class="font-bold text-right w-16">0,5</span>
              <span class="ml-2">%</span>
            </div>
            <div class="flex">
              <span class="flex-1">FMetHb</span>
              <span class="font-bold text-right w-16">0,7</span>
              <span class="ml-2">%</span>
            </div>
          </div>
        </div>
        
    <!-- Electrolyte values Section -->
        <div class="mb-6">
          <h2 class="font-bold text-sm mb-2">Electrolyte values</h2>
          <div class="text-sm space-y-1 ml-8">
            <div class="flex">
              <span class="flex-1">cK⁺</span>
              <span class="font-bold text-right w-16">3,7</span>
              <span class="ml-2">mmol/L</span>
            </div>
            <div class="flex">
              <span class="flex-1">cNa⁺</span>
              <span class="font-bold text-right w-16">143</span>
              <span class="ml-2">mmol/L</span>
            </div>
            <div class="flex">
              <span class="flex-1">cCa²⁺</span>
              <span class="font-bold text-right w-16">1,19</span>
              <span class="ml-2">mmol/L</span>
            </div>
            <div class="flex">
              <span class="flex-1">cCa²⁺(7.4)c</span>
              <span class="font-bold text-right w-16">1,22</span>
              <span class="ml-2">mmol/L</span>
            </div>
            <div class="flex">
              <span class="flex-1">cCl⁻</span>
              <span class="font-bold text-right w-16">111</span>
              <span class="ml-2">mmol/L</span>
            </div>
          </div>
        </div>
        
    <!-- Metabolite values Section -->
        <div class="mb-6">
          <h2 class="font-bold text-sm mb-2">Metabolite values</h2>
          <div class="text-sm space-y-1 ml-8">
            <div class="flex">
              <span class="flex-1">cGlu</span>
              <span class="font-bold text-right w-16">8,7</span>
              <span class="ml-2">mmol/L</span>
            </div>
            <div class="flex">
              <span class="flex-1">cLac</span>
              <span class="font-bold text-right w-16">0,7</span>
              <span class="ml-2">mmol/L</span>
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
    </div>
    """
  end
end
