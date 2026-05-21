import { GetItemNameAndDescriptionConcat, hookFunction, isCloth, isPhraseInString } from "utils";
import { BaseState } from "./BaseState";
import { StateModule } from "Modules/states";
import { ModuleCategory } from "Settings/setting_definitions";
import { getModule } from "modules";
import { GetDotedPathType, PatchHook } from "bondage-club-mod-sdk";

export class XRayVisionState extends BaseState {
    XRayKeywords: string[] = [
        "xray",
        "x-ray",
        "x ray"
    ];
    PossibleXRayEyewear: string[] = [
        "InteractiveVisor",
        "InteractiveVRHeadset",
        "FuturisticMask",
        "BlackoutLenses",
        "DroneMask",
        "AnimeLenses"
    ]
    Type: LSCGState = "x-ray-vision";

    Icon(C: OtherCharacter): string {
        return "Icons/Explore.png";
    }
    Label(C: OtherCharacter): string {
        return "X-Ray Vision";
    }

    constructor(state: StateModule) {
        super(state);
    }

    get Active(): boolean {
        return this.config.active || this.WearingGlasses;
    }

    _WearingGlasses: boolean = false;
    get WearingGlasses(): boolean {
        let newWearingState = false;
        let eyewear = InventoryGet(Player, "ItemHead");
        if (eyewear && this.PossibleXRayEyewear.some(name => name === eyewear!.Asset.Name)) {
            let itemStr = GetItemNameAndDescriptionConcat(eyewear) ?? "";
            newWearingState = this.XRayKeywords.some(key => isPhraseInString(itemStr ?? "", key));
        }
        if (this._WearingGlasses != newWearingState) {
            setTimeout(() => {
                // If glasses change, queue a redraw
                ChatRoomCharacter.forEach(C => {
                    CharacterLoadCanvas(C);
                });
            }, 1000);
        }            
        this._WearingGlasses = newWearingState;
        return this._WearingGlasses
    }

    Init(): void {
        hookFunction("CommonCallFunctionByName", 1, (args, next) => {
            const [funcName, funcArgs] = args;
            if (!/Assets(.+)BeforeDraw/i.test(funcName) || !funcArgs || !this.Active) {
                return next(args);
            }

            const params = funcArgs as Parameters<PatchHook<GetDotedPathType<typeof globalThis, "AssetsItemArmsHempRopeBeforeDraw">>>[0][0]
            const { C: origC, CA, L } = params;
            const C = origC as OtherCharacter;

            let opacityEnabled = Player.IsPlayer() && (Player.LSCG?.OpacityModule?.enabled ?? true);
            let ret = next(args) ?? {};
            if (opacityEnabled && this.CanViewXRay(C) && !!CA && isCloth(CA) && !(params['Property']?.LSCGLeadLined ?? false)) {
                let layerName = L?.trim() ?? "";
                let layerIx = CA.Asset.Layer.findIndex(l => l.Name == layerName);
                let originalLayerOpacity = (Array.isArray(CA?.Property?.Opacity) ? CA?.Property?.Opacity[layerIx] : CA.Property?.Opacity) ?? 1;
                let curOpacity = ret.Opacity ?? originalLayerOpacity ?? 1;
                ret.Opacity = curOpacity * .5;
                ret.AlphaMasks = [];
            }
            return ret;
        }, ModuleCategory.States);
    }

    Activate(memberNumber?: number | undefined, duration?: number | undefined, emote?: boolean | undefined): BaseState | undefined {
        let ret = super.Activate(memberNumber, duration, emote);
        ChatRoomCharacter.forEach(C => {
            CharacterLoadCanvas(C);
        });
        return ret;
    }

    Recover(emote?: boolean | undefined): BaseState | undefined {
        let ret = super.Recover(emote);
        ChatRoomCharacter.forEach(C => {
            CharacterLoadCanvas(C);
        });
        return ret;
    }

    CanViewXRay(C: PlayerCharacter | OtherCharacter) {
        return (C?.LSCG?.MagicModule?.enabled && !C?.LSCG?.MagicModule?.blockXRay) ?? false;
    }

    RoomSync(): void {}

    SpeechBlock(): void {}
}