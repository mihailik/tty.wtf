using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

using Newtonsoft.Json;

using SixLabors.Fonts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace Ttywtf
{
  public static class renderTextNet6
  {
    [FunctionName("renderTextNet6")]
    public static async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
        ILogger log,
        ExecutionContext context)
    {
      log.LogInformation("C# HTTP trigger function processed a request " + context.FunctionAppDirectory + " " + context);

      int width = 800;
      int height = 418;

      int padding = 8;
      float fontSize = 39;
      byte[] buf;

      using (Image img = new Image<Rgba32>(width, height))
      {
        log.LogInformation("Image created at " + width + "x" + height + ": " + img);

        var fontCollection = new FontCollection();
        log.LogInformation("Created FontCollection: " + fontCollection);
        var emojiFont = fontCollection.Install(context.FunctionAppDirectory + "/fonts/NotoEmoji-VariableFont_wght.ttf");
        log.LogInformation("Loaded emojiFont: " + emojiFont);
        var mathFont = fontCollection.Install(context.FunctionAppDirectory + "/fonts/NotoSansMath-Regular.ttf");
        log.LogInformation("Loaded mathFont: " + mathFont);

        string text = req.Query["text"];
        if (text == null || text == "") text = "WTF.TTY";

        log.LogInformation("Text retrieved: " + text);

        var textGraphicsOptions = new TextGraphicsOptions
        {
          TextOptions = {
            WrapTextWidth = width - padding * 2
          }
        };

        var renderOpt = new RendererOptions(
          mathFont.CreateFont(fontSize, FontStyle.Regular),
          textGraphicsOptions.TextOptions.DpiX,
          textGraphicsOptions.TextOptions.DpiY
        )
        {
          FallbackFontFamilies = new[] { emojiFont }
        };
        log.LogInformation("RenderOptions: " + renderOpt);

        var glyphs = TextBuilder.GenerateGlyphs(text, new PointF(padding, padding), renderOpt);

        log.LogInformation("Glyphs generated: " + glyphs);

        img.Mutate(ctx =>
          ctx
          .Fill(Color.White)
          .Fill(Color.Black, glyphs)
        );

        log.LogInformation("Image mutated: " + img);

        var bufStream = new MemoryStream();
        var pngEncoder = new SixLabors.ImageSharp.Formats.Png.PngEncoder();
        var task = img.SaveAsPngAsync(bufStream, pngEncoder);
        log.LogInformation("SaveAsPngAsync called: " + task);

        await task;
        log.LogInformation("SaveAsPngAsync returned: " + bufStream.Length);

        buf = bufStream.ToArray();
      }

      var ok = new FileStreamResult(new MemoryStream(buf), "image/png");

      log.LogInformation("ok result formed: " + ok);

      return ok;
    }
  }
}
