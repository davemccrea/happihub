defmodule Astrup.Ecgs.Databases.PtbxlTest do
  use ExUnit.Case, async: true

  alias Astrup.ECG.Datasets.Ptbxl

  describe "get_by_filename/1" do
    test "returns nil when PTB-XL server is not running" do
      # This test will fail if the server isn't running, but that's expected
      # in most test environments
      assert Ptbxl.get_by_filename("test_filename") == nil
    end
  end
end
