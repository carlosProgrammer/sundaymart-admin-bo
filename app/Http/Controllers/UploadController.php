<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class UploadController extends Controller
{
    use ApiResponse;

    public function upload(Request $request)
    {
        $file = $request->file('file');
        $destinationPath = public_path().'/uploads';
        $file_name = time()."_".$file->getClientOriginalName();
        if ($file->move($destinationPath, $file_name)) {
            return response()->json([
                'success' => 1,
                'name' => $file_name,
                'msg' => "Image uploaded"
            ]);
        }

        return $this->errorResponse("Error in image uploading");
    }
}
