def test_api_transform_map_single_line(client, example_db):
    resp = client.post(
        "/api/transform/1/transformations",
        json={
            "type": "map",
            "mode": "restrictedpython",
            "datapath": ["Tên"],
            "code": "return value.upper()",
            "tolerance": 3,
        },
    )
    transformed_data = [
        {"ok": "FANSIPAN", "path": 0, "value": "Fansipan"},
        {"ok": "PUTALENG", "path": 1, "value": "Putaleng"},
        {"ok": "PU SI LUNG", "path": 2, "value": "Pu Si Lung"},
        {
            "ok": "KỶ QUAN SAN (BẠCH MỘC LƯƠNG TỬ)",
            "path": 3,
            "value": "Kỷ Quan San (Bạch Mộc Lương Tử)",
        },
        {"ok": "KHANG SU VĂN", "path": 4, "value": "Khang Su Văn"},
        {"ok": "TẢ LIÊN (CỔ TRÂU)", "path": 5, "value": "Tả Liên (Cổ Trâu)"},
        {"ok": "PHÚ LƯƠNG (TẢ CHÌ NHÙ)", "path": 6, "value": "Phú Lương (Tả Chì Nhù)"},
        {"ok": "NHÌU CÔ SAN", "path": 7, "value": "Nhìu Cô San"},
        {"ok": "LÙNG CÚNG", "path": 8, "value": "Lùng Cúng"},
        {"ok": "NAM KANG HO TAO", "path": 9, "value": "Nam Kang Ho Tao"},
        {"ok": "TÀ XÙA", "path": 10, "value": "Tà Xùa"},
        {"ok": "LẢO THẨN", "path": 11, "value": "Lảo Thẩn"},
        {"ok": "PHU XAI LAI LENG", "path": 12, "value": "Phu Xai Lai Leng"},
        {"ok": "NGỌC LINH (NGOK LINH)", "path": 13, "value": "Ngọc Linh (Ngok Linh)"},
        {"ok": "PHU TRA", "path": 14, "value": "Phu Tra"},
        {"ok": "TÂY CÔN LĨNH", "path": 15, "value": "Tây Côn Lĩnh"},
        {"ok": "CHƯ YANG SIN", "path": 16, "value": "Chư Yang Sin"},
        {"ok": "KIỀU LIÊU TI", "path": 17, "value": "Kiều Liêu Ti"},
        {"ok": "MƯỜNG HOONG", "path": 18, "value": "Mường Hoong"},
        {"ok": "RÀO CỎ", "path": 19, "value": "Rào Cỏ"},
        {"ok": "NGOK PHAN", "path": 20, "value": "Ngok Phan"},
        {"ok": "NGOK LUM HEO", "path": 21, "value": "Ngok Lum Heo"},
        {"ok": "NGOK KRINH", "path": 22, "value": "Ngok Krinh"},
    ]
    response = resp.json
    assert resp.status_code == 200
    assert len(response) == len(transformed_data)
    assert response == transformed_data


def test_api_transform_map_single_line_rows(client, example_db):
    resp = client.post(
        "/api/transform/1/transformations",
        json={
            "type": "map",
            "mode": "restrictedpython",
            "datapath": ["Tên"],
            "code": "return value.upper()",
            "tolerance": 3,
            "rows": 5,
        },
    )
    transformed_data = [
        {"ok": "FANSIPAN", "path": 0, "value": "Fansipan"},
        {"ok": "PUTALENG", "path": 1, "value": "Putaleng"},
        {"ok": "PU SI LUNG", "path": 2, "value": "Pu Si Lung"},
        {
            "ok": "KỶ QUAN SAN (BẠCH MỘC LƯƠNG TỬ)",
            "path": 3,
            "value": "Kỷ Quan San (Bạch Mộc Lương Tử)",
        },
        {"ok": "KHANG SU VĂN", "path": 4, "value": "Khang Su Văn"},
    ]

    response = resp.json
    assert resp.status_code == 200
    assert len(response) == len(transformed_data)
    assert response == transformed_data


def test_api_transform_map_outputpath(client, example_db):
    resp = client.post(
        "/api/transform/1/transformations",
        json={
            "type": "map",
            "mode": "restrictedpython",
            "datapath": ["Tên"],
            "code": "return value.upper()",
            "tolerance": 3,
            "outputpath": ["Name", "Age"],
            "rows": 5,
        },
    )
    transformed_data = {
        "message": "400 Bad Request: For transform type map the outputpath should be a single column",
        "status": "error",
    }

    response = resp.json
    assert resp.status_code == 400
    assert len(response) == len(transformed_data)
    assert response == transformed_data


def test_api_transform_map_single_line_context(client, example_db):
    resp = client.post(
        "/api/transform/1/transformations",
        json={
            "type": "filter",
            "mode": "restrictedpython",
            "datapath": ["Tên"],
            "code": "return True if int(context.row[4]) > 800 else False",
            "tolerance": 3,
        },
    )

    transformed_data = [
        {"ok": True, "path": 0, "value": "Fansipan"},
        {"ok": True, "path": 1, "value": "Putaleng"},
        {"ok": True, "path": 2, "value": "Pu Si Lung"},
        {"ok": True, "path": 3, "value": "Kỷ Quan San (Bạch Mộc Lương Tử)"},
        {"ok": True, "path": 4, "value": "Khang Su Văn"},
        {"ok": True, "path": 5, "value": "Tả Liên (Cổ Trâu)"},
        {"ok": True, "path": 6, "value": "Phú Lương (Tả Chì Nhù)"},
        {"ok": True, "path": 7, "value": "Nhìu Cô San"},
        {"ok": True, "path": 8, "value": "Lùng Cúng"},
        {"ok": True, "path": 9, "value": "Nam Kang Ho Tao"},
        {"ok": True, "path": 10, "value": "Tà Xùa"},
        {"ok": True, "path": 11, "value": "Lảo Thẩn"},
        {"ok": True, "path": 12, "value": "Phu Xai Lai Leng"},
        {"ok": True, "path": 13, "value": "Ngọc Linh (Ngok Linh)"},
        {"ok": True, "path": 14, "value": "Phu Tra"},
        {"ok": True, "path": 15, "value": "Tây Côn Lĩnh"},
        {
            "error": "Traceback (most recent call last):\n"
            '  File "<string>", line 1, in <function>\n'
            "ValueError: invalid literal for int() with base 10: '2420-2422'\n",
            "path": 16,
            "value": "Chư Yang Sin",
        },
        {"ok": True, "path": 17, "value": "Kiều Liêu Ti"},
        {"ok": True, "path": 18, "value": "Mường Hoong"},
        {"ok": True, "path": 19, "value": "Rào Cỏ"},
        {"ok": True, "path": 20, "value": "Ngok Phan"},
        {"ok": True, "path": 21, "value": "Ngok Lum Heo"},
        {"ok": True, "path": 22, "value": "Ngok Krinh"},
    ]

    response = resp.json
    assert resp.status_code == 200
    assert len(response) == len(transformed_data)
    assert response == transformed_data


def test_api_transform_map_single_line_fail(client, example_db):
    resp = client.post(
        "/api/transform/1/transformations",
        json={
            "type": "map",
            "mode": "restrictedpython",
            "datapath": ["Tên"],
            "code": "return value+1",
            "tolerance": 3,
            "outputpath": ["new col data"],
        },
    )
    transformed_data = [
        {
            "error": "Traceback (most recent call last):\n"
            '  File "<string>", line 1, in <function>\n'
            'TypeError: can only concatenate str (not "int") to str\n',
            "path": 0,
            "value": "Fansipan",
        },
        {
            "error": "Traceback (most recent call last):\n"
            '  File "<string>", line 1, in <function>\n'
            'TypeError: can only concatenate str (not "int") to str\n',
            "path": 1,
            "value": "Putaleng",
        },
        {
            "error": "Traceback (most recent call last):\n"
            '  File "<string>", line 1, in <function>\n'
            'TypeError: can only concatenate str (not "int") to str\n',
            "path": 2,
            "value": "Pu Si Lung",
        },
    ]
    response = resp.json
    assert resp.status_code == 200
    assert len(response) == len(transformed_data)
    assert response == transformed_data


def test_api_transform_map_multiline_error(client, example_db):
    resp = client.post(
        "/api/transform/1/transformations",
        json={
            "type": "map",
            "mode": "restrictedpython",
            "datapath": ["Tên"],
            "code": """
def error_func():
    result = 1/0

error_func()
return value+1
    """.strip(),
            "tolerance": 3,
            "outputpath": ["new col data"],
        },
    )
    transformed_data = [
        {
            "error": "Traceback (most recent call last):\n"
            '  File "<string>", line 4, in <function>\n'
            '  File "<string>", line 2, in error_func\n'
            "ZeroDivisionError: division by zero\n",
            "path": 0,
            "value": "Fansipan",
        },
        {
            "error": "Traceback (most recent call last):\n"
            '  File "<string>", line 4, in <function>\n'
            '  File "<string>", line 2, in error_func\n'
            "ZeroDivisionError: division by zero\n",
            "path": 1,
            "value": "Putaleng",
        },
        {
            "error": "Traceback (most recent call last):\n"
            '  File "<string>", line 4, in <function>\n'
            '  File "<string>", line 2, in error_func\n'
            "ZeroDivisionError: division by zero\n",
            "path": 2,
            "value": "Pu Si Lung",
        },
    ]

    response = resp.json
    assert resp.status_code == 200
    assert len(response) == len(transformed_data)
    assert response == transformed_data


def test_api_transform_map_multiline_multi_error(client, example_db):
    resp = client.post(
        "/api/transform/1/transformations",
        json={
            "type": "map",
            "mode": "restrictedpython",
            "datapath": ["Tên"],
            "code": """
def error_func():
    try:
        result = 1/0
    except:
        raise AssertionError()
error_func()
return value+1
    """.strip(),
            "tolerance": 3,
            "outputpath": ["new col data"],
        },
    )
    transformed_data = [
        {
            "error": 'Traceback (most recent call last):\n  File "<string>", line 3, in error_func\nZeroDivisionError: '
            "division by zero\n\nDuring handling of the above exception, another exception "
            'occurred:\n\nTraceback (most recent call last):\n  File "<string>", line 6, in <function>\n  File '
            '"<string>", line 5, in error_func\nAssertionError\n',
            "path": 0,
            "value": "Fansipan",
        },
        {
            "error": 'Traceback (most recent call last):\n  File "<string>", line 3, '
            "in error_func\nZeroDivisionError: division by zero\n\nDuring handling of the above exception, "
            'another exception occurred:\n\nTraceback (most recent call last):\n  File "<string>", line 6, '
            'in <function>\n  File "<string>", line 5, in error_func\nAssertionError\n',
            "path": 1,
            "value": "Putaleng",
        },
        {
            "error": 'Traceback (most recent call last):\n  File "<string>", line 3, '
            "in error_func\nZeroDivisionError: division by zero\n\nDuring handling of the above exception, "
            'another exception occurred:\n\nTraceback (most recent call last):\n  File "<string>", line 6, '
            'in <function>\n  File "<string>", line 5, in error_func\nAssertionError\n',
            "path": 2,
            "value": "Pu Si Lung",
        },
    ]
    response = resp.json
    assert resp.status_code == 200
    assert len(response) == len(transformed_data)
    assert response == transformed_data


def test_api_transform_map_multiline(client, example_db):
    resp = client.post(
        "/api/transform/1/transformations",
        json={
            "type": "map",
            "mode": "restrictedpython",
            "datapath": ["Tên"],
            "code": "if len(value)>10:\n\treturn value\nelse:\n\treturn 'false'",
            "tolerance": 3,
        },
    )
    transformed_data = [
        {"ok": "false", "path": 0, "value": "Fansipan"},
        {"ok": "false", "path": 1, "value": "Putaleng"},
        {"ok": "false", "path": 2, "value": "Pu Si Lung"},
        {
            "ok": "Kỷ Quan San (Bạch Mộc Lương Tử)",
            "path": 3,
            "value": "Kỷ Quan San (Bạch Mộc Lương Tử)",
        },
        {"ok": "Khang Su Văn", "path": 4, "value": "Khang Su Văn"},
        {"ok": "Tả Liên (Cổ Trâu)", "path": 5, "value": "Tả Liên (Cổ Trâu)"},
        {"ok": "Phú Lương (Tả Chì Nhù)", "path": 6, "value": "Phú Lương (Tả Chì Nhù)"},
        {"ok": "Nhìu Cô San", "path": 7, "value": "Nhìu Cô San"},
        {"ok": "false", "path": 8, "value": "Lùng Cúng"},
        {"ok": "Nam Kang Ho Tao", "path": 9, "value": "Nam Kang Ho Tao"},
        {"ok": "false", "path": 10, "value": "Tà Xùa"},
        {"ok": "false", "path": 11, "value": "Lảo Thẩn"},
        {"ok": "Phu Xai Lai Leng", "path": 12, "value": "Phu Xai Lai Leng"},
        {"ok": "Ngọc Linh (Ngok Linh)", "path": 13, "value": "Ngọc Linh (Ngok Linh)"},
        {"ok": "false", "path": 14, "value": "Phu Tra"},
        {"ok": "Tây Côn Lĩnh", "path": 15, "value": "Tây Côn Lĩnh"},
        {"ok": "Chư Yang Sin", "path": 16, "value": "Chư Yang Sin"},
        {"ok": "Kiều Liêu Ti", "path": 17, "value": "Kiều Liêu Ti"},
        {"ok": "Mường Hoong", "path": 18, "value": "Mường Hoong"},
        {"ok": "false", "path": 19, "value": "Rào Cỏ"},
        {"ok": "false", "path": 20, "value": "Ngok Phan"},
        {"ok": "Ngok Lum Heo", "path": 21, "value": "Ngok Lum Heo"},
        {"ok": "false", "path": 22, "value": "Ngok Krinh"},
    ]
    response = resp.json
    assert resp.status_code == 200
    assert len(response) == len(transformed_data)
    assert response == transformed_data


def test_api_transform_filter_multiline(client, example_db):
    resp = client.post(
        "/api/transform/1/transformations",
        json={
            "type": "filter",
            "mode": "restrictedpython",
            "datapath": ["Tên"],
            "code": "if len(value)>15:\n\treturn True\nelse:\n\treturn False",
            "tolerance": 3,
        },
    )

    transformed_data = [
        {"ok": False, "path": 0, "value": "Fansipan"},
        {"ok": False, "path": 1, "value": "Putaleng"},
        {"ok": False, "path": 2, "value": "Pu Si Lung"},
        {"ok": True, "path": 3, "value": "Kỷ Quan San (Bạch Mộc Lương Tử)"},
        {"ok": False, "path": 4, "value": "Khang Su Văn"},
        {"ok": True, "path": 5, "value": "Tả Liên (Cổ Trâu)"},
        {"ok": True, "path": 6, "value": "Phú Lương (Tả Chì Nhù)"},
        {"ok": False, "path": 7, "value": "Nhìu Cô San"},
        {"ok": False, "path": 8, "value": "Lùng Cúng"},
        {"ok": False, "path": 9, "value": "Nam Kang Ho Tao"},
        {"ok": False, "path": 10, "value": "Tà Xùa"},
        {"ok": False, "path": 11, "value": "Lảo Thẩn"},
        {"ok": True, "path": 12, "value": "Phu Xai Lai Leng"},
        {"ok": True, "path": 13, "value": "Ngọc Linh (Ngok Linh)"},
        {"ok": False, "path": 14, "value": "Phu Tra"},
        {"ok": False, "path": 15, "value": "Tây Côn Lĩnh"},
        {"ok": False, "path": 16, "value": "Chư Yang Sin"},
        {"ok": False, "path": 17, "value": "Kiều Liêu Ti"},
        {"ok": False, "path": 18, "value": "Mường Hoong"},
        {"ok": False, "path": 19, "value": "Rào Cỏ"},
        {"ok": False, "path": 20, "value": "Ngok Phan"},
        {"ok": False, "path": 21, "value": "Ngok Lum Heo"},
        {"ok": False, "path": 22, "value": "Ngok Krinh"},
    ]

    response = resp.json
    assert resp.status_code == 200
    assert len(response) == len(transformed_data)
    assert response == transformed_data


def test_api_transform_filter_single_line_fail(client, example_db):
    resp = client.post(
        "/api/transform/1/transformations",
        json={
            "type": "filter",
            "mode": "restrictedpython",
            "datapath": ["Tên"],
            "code": "return len(value)+str(5)",
            "tolerance": 3,
            "outputpath": ["new col data"],
        },
    )
    transformed_data = [
        {
            "error": "Traceback (most recent call last):\n"
            '  File "<string>", line 1, in <function>\n'
            "TypeError: unsupported operand type(s) for +: 'int' and 'str'\n",
            "path": 0,
            "value": "Fansipan",
        },
        {
            "error": "Traceback (most recent call last):\n"
            '  File "<string>", line 1, in <function>\n'
            "TypeError: unsupported operand type(s) for +: 'int' and 'str'\n",
            "path": 1,
            "value": "Putaleng",
        },
        {
            "error": "Traceback (most recent call last):\n"
            '  File "<string>", line 1, in <function>'
            "\n"
            "TypeError: unsupported operand type(s) for +: 'int' and 'str'\n",
            "path": 2,
            "value": "Pu Si Lung",
        },
    ]
    response = resp.json
    assert resp.status_code == 200
    assert len(response) == len(transformed_data)
    assert response == transformed_data


def test_api_transform_split_single_line(client, example_db):
    resp = client.post(
        "/api/transform/1/transformations",
        json={
            "type": "split",
            "mode": "restrictedpython",
            "datapath": ["Tên"],
            "code": "return value.split('(')",
            "outputpath": ["FirstCol", "SecondCol"],
            "tolerance": 3,
        },
    )
    transformed_data = [
        {"ok": ["Fansipan"], "path": 0, "value": "Fansipan"},
        {"ok": ["Putaleng"], "path": 1, "value": "Putaleng"},
        {"ok": ["Pu Si Lung"], "path": 2, "value": "Pu Si Lung"},
        {
            "ok": ["Kỷ Quan San ", "Bạch Mộc Lương Tử)"],
            "path": 3,
            "value": "Kỷ Quan San (Bạch Mộc Lương Tử)",
        },
        {"ok": ["Khang Su Văn"], "path": 4, "value": "Khang Su Văn"},
        {"ok": ["Tả Liên ", "Cổ Trâu)"], "path": 5, "value": "Tả Liên (Cổ Trâu)"},
        {
            "ok": ["Phú Lương ", "Tả Chì Nhù)"],
            "path": 6,
            "value": "Phú Lương (Tả Chì Nhù)",
        },
        {"ok": ["Nhìu Cô San"], "path": 7, "value": "Nhìu Cô San"},
        {"ok": ["Lùng Cúng"], "path": 8, "value": "Lùng Cúng"},
        {"ok": ["Nam Kang Ho Tao"], "path": 9, "value": "Nam Kang Ho Tao"},
        {"ok": ["Tà Xùa"], "path": 10, "value": "Tà Xùa"},
        {"ok": ["Lảo Thẩn"], "path": 11, "value": "Lảo Thẩn"},
        {"ok": ["Phu Xai Lai Leng"], "path": 12, "value": "Phu Xai Lai Leng"},
        {
            "ok": ["Ngọc Linh ", "Ngok Linh)"],
            "path": 13,
            "value": "Ngọc Linh (Ngok Linh)",
        },
        {"ok": ["Phu Tra"], "path": 14, "value": "Phu Tra"},
        {"ok": ["Tây Côn Lĩnh"], "path": 15, "value": "Tây Côn Lĩnh"},
        {"ok": ["Chư Yang Sin"], "path": 16, "value": "Chư Yang Sin"},
        {"ok": ["Kiều Liêu Ti"], "path": 17, "value": "Kiều Liêu Ti"},
        {"ok": ["Mường Hoong"], "path": 18, "value": "Mường Hoong"},
        {"ok": ["Rào Cỏ"], "path": 19, "value": "Rào Cỏ"},
        {"ok": ["Ngok Phan"], "path": 20, "value": "Ngok Phan"},
        {"ok": ["Ngok Lum Heo"], "path": 21, "value": "Ngok Lum Heo"},
        {"ok": ["Ngok Krinh"], "path": 22, "value": "Ngok Krinh"},
    ]
    response = resp.json
    assert resp.status_code == 200
    assert len(response) == len(transformed_data)
    assert response == transformed_data


def test_api_transform_concatenate_single_line(client, example_db):
    resp = client.post(
        "/api/transform/1/transformations",
        json={
            "type": "concatenate",
            "mode": "restrictedpython",
            "datapath": ["Tên", "Tọa độ"],
            "code": "return value[0] + value[1]",
            "tolerance": 3,
        },
    )
    transformed_data = [
        {
            "ok": "Fansipan22°20′51″B 103°49′3″Đ",
            "path": 0,
            "value": ["Fansipan", "22°20′51″B 103°49′3″Đ"],
        },
        {"ok": "Putaleng", "path": 1, "value": ["Putaleng", ""]},
        {
            "ok": "Pu Si Lung22°37′38″B 102°47′09″Đ",
            "path": 2,
            "value": ["Pu Si Lung", "22°37′38″B 102°47′09″Đ"],
        },
        {
            "ok": "Kỷ Quan San (Bạch Mộc Lương Tử)22°30′28″B 103°35′15″Đ",
            "path": 3,
            "value": ["Kỷ Quan San (Bạch Mộc Lương Tử)", "22°30′28″B 103°35′15″Đ"],
        },
        {
            "ok": "Khang Su Văn22°45′12″B 103°26′24″Đ",
            "path": 4,
            "value": ["Khang Su Văn", "22°45′12″B 103°26′24″Đ"],
        },
        {
            "ok": "Tả Liên (Cổ Trâu)22°49′18″B 103°33′22.08″Đ",
            "path": 5,
            "value": ["Tả Liên (Cổ Trâu)", "22°49′18″B 103°33′22.08″Đ"],
        },
        {
            "ok": "Phú Lương (Tả Chì Nhù)",
            "path": 6,
            "value": ["Phú Lương (Tả Chì Nhù)", ""],
        },
        {"ok": "Nhìu Cô San", "path": 7, "value": ["Nhìu Cô San", ""]},
        {"ok": "Lùng Cúng", "path": 8, "value": ["Lùng Cúng", ""]},
        {"ok": "Nam Kang Ho Tao", "path": 9, "value": ["Nam Kang Ho Tao", ""]},
        {"ok": "Tà Xùa", "path": 10, "value": ["Tà Xùa", ""]},
        {"ok": "Lảo Thẩn", "path": 11, "value": ["Lảo Thẩn", ""]},
        {
            "ok": "Phu Xai Lai Leng19°12′B 104°11′Đ",
            "path": 12,
            "value": ["Phu Xai Lai Leng", "19°12′B 104°11′Đ"],
        },
        {
            "ok": "Ngọc Linh (Ngok Linh)",
            "path": 13,
            "value": ["Ngọc Linh (Ngok Linh)", ""],
        },
        {"ok": "Phu Tra", "path": 14, "value": ["Phu Tra", ""]},
        {
            "ok": "Tây Côn Lĩnh22°48'26.0\"B 104°47'14.0\"Đ",
            "path": 15,
            "value": ["Tây Côn Lĩnh", "22°48'26.0\"B 104°47'14.0\"Đ"],
        },
        {"ok": "Chư Yang Sin", "path": 16, "value": ["Chư Yang Sin", ""]},
        {"ok": "Kiều Liêu Ti", "path": 17, "value": ["Kiều Liêu Ti", ""]},
        {"ok": "Mường Hoong", "path": 18, "value": ["Mường Hoong", ""]},
        {
            "ok": "Rào Cỏ18°09′27″B 105°24′45″Đ",
            "path": 19,
            "value": ["Rào Cỏ", "18°09′27″B 105°24′45″Đ"],
        },
        {"ok": "Ngok Phan", "path": 20, "value": ["Ngok Phan", ""]},
        {"ok": "Ngok Lum Heo", "path": 21, "value": ["Ngok Lum Heo", ""]},
        {"ok": "Ngok Krinh", "path": 22, "value": ["Ngok Krinh", ""]},
    ]
    response = resp.json
    assert resp.status_code == 200
    assert len(response) == len(transformed_data)
    assert response == transformed_data


def test_api_transform_compilation_error(client, example_db):
    resp = client.post(
        "/api/transform/1/transformations",
        json={
            "type": "concatenate",
            "mode": "restrictedpython",
            "datapath": ["Tên", "Tọa độ"],
            "code": """
def error_func():
result = 1/0

error_func()
return value+1
    """.strip(),
            "tolerance": 3,
        },
    )

    response = resp.json
    assert resp.status_code == 400
    assert response == {
        "message": "400 Bad Request: Line 2: IndentationError: expected an indented block at "
        "statement: 'result = 1/0'",
        "status": "error",
    } or response == {
        "message": "400 Bad Request: Line 2: IndentationError: expected an indented block after function definition on line 1 "
        "at statement: 'result = 1/0'",
        "status": "error",
    }


def test_api_transform_map_single_line_str(client, example_db):
    resp = client.post(
        "/api/transform/1/transformations",
        json={
            "type": "map",
            "mode": "restrictedpython",
            "datapath": "Tên",
            "code": "return value.upper()",
            "tolerance": 3,
        },
    )
    transformed_data = [
        {"ok": "FANSIPAN", "path": 0, "value": "Fansipan"},
        {"ok": "PUTALENG", "path": 1, "value": "Putaleng"},
        {"ok": "PU SI LUNG", "path": 2, "value": "Pu Si Lung"},
        {
            "ok": "KỶ QUAN SAN (BẠCH MỘC LƯƠNG TỬ)",
            "path": 3,
            "value": "Kỷ Quan San (Bạch Mộc Lương Tử)",
        },
        {"ok": "KHANG SU VĂN", "path": 4, "value": "Khang Su Văn"},
        {"ok": "TẢ LIÊN (CỔ TRÂU)", "path": 5, "value": "Tả Liên (Cổ Trâu)"},
        {"ok": "PHÚ LƯƠNG (TẢ CHÌ NHÙ)", "path": 6, "value": "Phú Lương (Tả Chì Nhù)"},
        {"ok": "NHÌU CÔ SAN", "path": 7, "value": "Nhìu Cô San"},
        {"ok": "LÙNG CÚNG", "path": 8, "value": "Lùng Cúng"},
        {"ok": "NAM KANG HO TAO", "path": 9, "value": "Nam Kang Ho Tao"},
        {"ok": "TÀ XÙA", "path": 10, "value": "Tà Xùa"},
        {"ok": "LẢO THẨN", "path": 11, "value": "Lảo Thẩn"},
        {"ok": "PHU XAI LAI LENG", "path": 12, "value": "Phu Xai Lai Leng"},
        {"ok": "NGỌC LINH (NGOK LINH)", "path": 13, "value": "Ngọc Linh (Ngok Linh)"},
        {"ok": "PHU TRA", "path": 14, "value": "Phu Tra"},
        {"ok": "TÂY CÔN LĨNH", "path": 15, "value": "Tây Côn Lĩnh"},
        {"ok": "CHƯ YANG SIN", "path": 16, "value": "Chư Yang Sin"},
        {"ok": "KIỀU LIÊU TI", "path": 17, "value": "Kiều Liêu Ti"},
        {"ok": "MƯỜNG HOONG", "path": 18, "value": "Mường Hoong"},
        {"ok": "RÀO CỎ", "path": 19, "value": "Rào Cỏ"},
        {"ok": "NGOK PHAN", "path": 20, "value": "Ngok Phan"},
        {"ok": "NGOK LUM HEO", "path": 21, "value": "Ngok Lum Heo"},
        {"ok": "NGOK KRINH", "path": 22, "value": "Ngok Krinh"},
    ]
    response = resp.json
    assert resp.status_code == 200
    assert len(response) == len(transformed_data)
    assert response == transformed_data


def test_api_transform_restrictedpython_compilation_error():
    code = """
def error_func():
result = 1/0

error_func()
return value+1
    """.strip()

    from sand.controllers.transform import compile_function

    captured_error = None
    try:
        transform_func = compile_function(code)
    except Exception as e:
        import sys
        import traceback

        (exc, value, tb) = sys.exc_info()
        tb = tb.tb_next.tb_next
        captured_error = "".join(traceback.format_exception(exc, value, tb))

    expected_error = ()

    assert captured_error in [
        "werkzeug.exceptions.BadRequest: 400 Bad Request: Line 2: IndentationError: expected an indented "
        "block at statement: 'result = 1/0'\n",
        "werkzeug.exceptions.BadRequest: 400 Bad Request: Line 2: IndentationError: expected an indented block after function definition on line 1 at statement: 'result = 1/0'\n",
    ]
