defmodule Astrup.Wfdb do
  def read(db_name, file_path) do
    dataset_path = Application.get_env(:astrup, :ecg_databases_path)
    read(dataset_path, db_name, file_path)
  end

  def read(dataset_path, db_name, file_path) do
    args = %{"dataset_path" => dataset_path, "db_name" => db_name, "file_path" => file_path}

    {result, _globals} =
      Pythonx.eval(
        """
        import wfdb

        dataset_path = dataset_path.decode('utf-8')
        db_name = db_name.decode('utf-8')
        file_path = file_path.decode('utf-8')

        record = wfdb.rdrecord(dataset_path + "/" + db_name + "/" + file_path)
        record_dict = record.__dict__
        record_dict['p_signal'] = record.p_signal.tolist()
        record_dict
        """,
        args
      )

    Pythonx.decode(result)
  end
end
